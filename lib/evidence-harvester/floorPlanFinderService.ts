/**
 * floorPlanFinderService — find candidate floor-plan PDFs for a property from UK council planning
 * portals (public records).
 *
 * Pipeline:  postcode -> resolve council -> DB cache check
 *            -> discover applications (direct Idox portal search -> PlanWire -> PlanIt fallback)
 *            -> match to the EXACT address (door number + street)
 *            -> per-portal adapter scrapes the documents page (every attached file, not just plans)
 *            -> persist to the shared cache.
 *
 * We keep ALL documents for the matched application(s) — floor plans, elevations, site/location
 * plans, application forms, statements, etc. — and the UI groups them into category tabs by
 * description (Floor plans / Elevations & sections / Site & location / Other drawings / Applications).
 *
 * A postcode contains many addresses, so results are tied to the property's exact door number; other
 * applications in the postcode are surfaced as "nearby applications". Discovery is cached per postcode
 * (shared) so repeat/nearby lookups are instant. Server-only.
 */
import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { fetchWithRetry } from './http';
import { lookupPostcode, normalisePostcode } from './postcodesService';
import { addressScore, isExactAddressMatch } from './addressUtils';
import { getPortalForCouncil, type CouncilPortal } from './councilPortalRegistry';
import { fetchPortalHtml } from './portalSession';
import {
  readSearchCache, isFresh, loadCachedResult, persistDiscovery, addressCacheKey,
  type DiscoverySource,
} from './planningCacheService';

// Re-export so existing importers (and the floorPlanFinder test) keep working.
export { addressScore } from './addressUtils';

const PLANIT_URL = 'https://www.planit.org.uk/api/applics/json';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HTML_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const PORTAL_DELAY_MS = 800;   // be polite to council servers
const MAX_EXTRACT = 8;         // exact-address applications we scrape documents from — budget-bound
const MAX_PERSIST = 50;        // cap rows persisted per postcode discovery (shared index)
const MIN_STAGE_MS = 8_000;    // don't start a new network stage with less budget than this
const DEFAULT_TTL_MS = (Number(process.env.PLANNING_CACHE_TTL_DAYS) || 14) * 86_400_000;
const BUDGET_MS = Number(process.env.FLOORPLAN_BUDGET_MS) || 90_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PlanItRecord = {
  uid?: string;
  address?: string;
  description?: string;
  app_type?: string;
  area_name?: string;
  distance?: number | string;
  url?: string;
  other_fields?: { docs_url?: string; n_documents?: number } | null;
};
type PlanItResponse = { records?: PlanItRecord[] };

/** A discovered planning application, portal-agnostic (Idox search / PlanWire / PlanIt all map to this). */
export type Candidate = {
  reference: string | null;
  address: string;
  description: string;
  appType: string | null;
  applicationUrl: string;   // summary/details page
  docsUrl: string;          // documents tab (session anchor for file serving)
  nDocuments: number | null;
};

export type FoundPlan = {
  description: string;
  url: string;            // the raw file URL (often session-bound — serve via the proxy route)
  docsUrl: string;        // the application documents page (used to establish the portal session)
  application: string | null;
  council: string | null;
  matchScore: number;
  exact: boolean;         // belongs to THIS exact address (not just the postcode)
};
/** A candidate planning application page (works for any council, even where we can't scrape PDFs). */
export type FoundApplication = {
  description: string;
  url: string;
  application: string | null;
  council: string | null;
  matchScore: number;
  extracted: boolean;     // did we manage to auto-pull plan PDFs from it?
  exact: boolean;         // belongs to THIS exact address (vs. nearby in the postcode)
};
export type FloorplanResult = {
  plans: FoundPlan[];
  applications: FoundApplication[];
  council: string | null;
};

export type FindFloorplansDeps = {
  db: SupabaseClient<Database>;
  cacheTtlMs?: number;
  refresh?: boolean;        // bypass the cache and re-discover
};

// ---------------------------------------------------------------------------
// Relevance (prefer applications likely to contain plans) — used as a nearby tiebreak.
// ---------------------------------------------------------------------------
const PLAN_SIGNALS: [RegExp, number][] = [
  [/\bextension\b/i, 3], [/\bloft\b/i, 3], [/\bconversion\b/i, 3],
  [/\binternal (alteration|refurb|remodel)/i, 3], [/\bfloor plan/i, 4],
  [/\blayout\b/i, 2], [/\bnew dwelling|new build/i, 3],
  [/\bramp/i, 4], [/\blevel[- ]access/i, 4], [/\bwheelchair/i, 4], [/\bdisabled\b/i, 3],
  [/\baccess improvement|accessible/i, 3], [/\blift\b/i, 3], [/\bwet ?room/i, 4],
  [/\bhandrail|grab rail/i, 2], [/\bdoor (upgrade|widen|alteration)/i, 2],
  [/\balteration/i, 1], [/\brefurbishment/i, 1], [/\bremodel/i, 1],
];
const TYPE_WEIGHT: Record<string, number> = {
  Full: 2, Heritage: 2, Amendment: 1, Conditions: -3, Advertising: -5, Trees: -5,
};

function relevanceScore(description: string, appType: string | null, nDocs: number | null): number {
  const desc = (description ?? '').toLowerCase();
  let s = PLAN_SIGNALS.reduce((acc, [pat, w]) => (pat.test(desc) ? acc + w : acc), 0);
  s += TYPE_WEIGHT[appType ?? ''] ?? 0;
  s += Math.min(nDocs ?? 0, 20) * 0.15;
  return s;
}

function deriveDocsUrl(rec: PlanItRecord): string | null {
  const of = rec.other_fields ?? {};
  if (of.docs_url) return of.docs_url;
  if (rec.url) return toDocsUrl(rec.url);
  return null;
}

/** Turn an Idox application URL into its documents-tab URL. */
function toDocsUrl(url: string): string {
  if (/activeTab=\w+/.test(url)) return url.replace(/activeTab=\w+/, 'activeTab=documents');
  if (/applicationDetails\.do/i.test(url)) return `${url}${url.includes('?') ? '&' : '?'}activeTab=documents`;
  return url;
}

// ---------------------------------------------------------------------------
// Portal adapters (extract = scrape docs page; search = direct discovery on the portal)
// ---------------------------------------------------------------------------
const PLAN_DOC_TYPES =
  /floor ?plan|proposed plan|existing plan|elevation|section|block plan|site plan|location plan|general arrangement/i;

export type PortalDoc = { description: string; url: string };

interface PortalAdapter {
  name: string;
  matches(url: string): boolean;
  extract(docsUrl: string): Promise<PortalDoc[]>;
  /** Direct discovery on the council's own portal (optional; Idox only for now). */
  search?(portal: CouncilPortal, postcode: string, address: string): Promise<Candidate[]>;
}

function anchorsToDocs(html: string, baseUrl: string, hrefTest: (href: string) => boolean): PortalDoc[] {
  const $ = cheerio.load(html);
  const docs: PortalDoc[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!hrefTest(href)) return;
    const row = $(el).closest('tr');
    const desc = (row.length ? row.text() : $(el).text()).replace(/\s+/g, ' ').trim();
    docs.push({ description: desc.slice(0, 200), url: new URL(href, baseUrl).toString() });
  });
  return docs;
}


/** Parse an Idox simple-search results page into candidates. Tolerant of layout variations. */
function parseIdoxResults(html: string, baseUrl: string): Candidate[] {
  const $ = cheerio.load(html);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

  const add = (href: string, address: string, meta: string, descText: string) => {
    if (!href || !/applicationDetails\.do/i.test(href)) return;
    const applicationUrl = new URL(href, baseUrl).toString();
    if (seen.has(applicationUrl)) return;
    seen.add(applicationUrl);
    const refMatch = meta.match(/Ref(?:erence)?(?:\s*No)?\.?:?\s*([A-Za-z0-9/_.\-]+)/i);
    const description = descText || address;
    out.push({
      reference: refMatch?.[1] ?? null,
      address: address || description || 'Unknown address',
      description: description.slice(0, 200),
      appType: null,
      applicationUrl,
      docsUrl: toDocsUrl(applicationUrl),
      nDocuments: null,
    });
  };

  const results = $('li.searchresult, .searchresult');
  if (results.length) {
    results.each((_, el) => {
      const scope = $(el);
      const anchor = scope.find('a[href*="applicationDetails"]').first();
      add(
        anchor.attr('href') ?? '',
        clean(scope.find('.address').text() || anchor.text()),
        clean(scope.find('.metaInfo, .meta').text()),
        clean(scope.find('.summaryInfo, .description').text() || anchor.text()),
      );
    });
  }
  if (out.length === 0) {
    $('a[href*="applicationDetails"]').each((_, el) => {
      const anchor = $(el);
      add(anchor.attr('href') ?? '', clean(anchor.text()), '', clean(anchor.text()));
    });
  }
  return out.slice(0, MAX_PERSIST);
}

/** Idox Public Access — /online-applications/ (most UK councils). */
const idoxAdapter: PortalAdapter = {
  name: 'idox',
  matches: (url) => /\/online-applications\//i.test(url),
  async extract(docsUrl) {
    // The documents tab needs the portal session — warm it on the application summary page first so
    // the file (/files/…) links render, then scrape the documents tab.
    const summaryUrl = docsUrl.replace(/activeTab=\w+/, 'activeTab=summary');
    const html = await fetchPortalHtml(docsUrl, { warmUrl: summaryUrl });
    if (!html) return [];
    return anchorsToDocs(html, docsUrl, (h) => h.includes('/files/') || h.toLowerCase().endsWith('.pdf'));
  },
  async search(portal, postcode) {
    // Modern Idox simple search is a two-step, CSRF-protected POST — a plain GET to search.do only
    // returns the empty "Simple Search" form (this was why direct search found nothing):
    //   1) GET the form -> establishes the session (JSESSIONID) cookie AND carries the Spring
    //      Security `_csrf` token that the results POST requires (without it the POST 403s).
    //   2) POST the postcode to simpleSearchResults.do (token + cookie + Referer) -> results page.
    const appBase = `${portal.baseUrl}${portal.searchPath.replace(/\/[^/]*$/, '')}`; // .../online-applications
    const formUrl = `${portal.baseUrl}${portal.searchPath}?action=simple&searchType=Application`;
    const resultsUrl = `${appBase}/simpleSearchResults.do?action=firstPage`;

    const formRes = await fetchWithRetry(formUrl, { headers: HTML_HEADERS }, { timeoutMs: 15000, retries: 2 });
    if (!formRes.ok) throw new Error(`idox form ${formRes.status}`);
    const formHtml = await formRes.text();
    const csrf = /name="_csrf"\s+value="([^"]+)"/i.exec(formHtml)?.[1];
    if (!csrf) return []; // not a modern Idox simple-search form — let discovery fall back to an aggregator
    const cookie = (formRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

    const body = new URLSearchParams({
      _csrf: csrf,
      'searchCriteria.simpleSearch': 'true',
      searchType: 'Application',
      'searchCriteria.simpleSearchString': postcode,
      action: 'Search',
    });
    const res = await fetchWithRetry(
      resultsUrl,
      {
        method: 'POST',
        headers: {
          ...HTML_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: portal.baseUrl,
          Referer: formUrl,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body.toString(),
        redirect: 'follow',
      },
      { timeoutMs: 20000, retries: 2 },
    );
    if (!res.ok) throw new Error(`idox search ${res.status}`);
    // Resolve relative result hrefs (applicationDetails.do?...) against the results URL so they keep
    // the /online-applications/ path segment (otherwise they 404 and fail the file-proxy allow-list).
    return parseIdoxResults(await res.text(), resultsUrl);
  },
};

/** Northgate / NEC Planning Explorer — extract only (direct search is a future phase). */
const northgateAdapter: PortalAdapter = {
  name: 'northgate',
  matches: (url) => /\/PlanningExplorer\/|\/Northgate\/|\/generic\//i.test(url),
  async extract(docsUrl) {
    const html = await fetchPortalHtml(docsUrl);
    if (!html) return [];
    return anchorsToDocs(html, docsUrl, (h) =>
      /\.pdf$|getDocument|ViewDocument|\/Document\//i.test(h),
    );
  },
};

const ADAPTERS: PortalAdapter[] = [idoxAdapter, northgateAdapter];

export function getAdapter(url: string): PortalAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}

export function filterPlans(docs: PortalDoc[]): PortalDoc[] {
  return docs.filter((d) => PLAN_DOC_TYPES.test(d.description));
}

// ---------------------------------------------------------------------------
// Discovery providers
// ---------------------------------------------------------------------------
type TimeBudget = { remaining: () => number };
function newBudget(ms: number): TimeBudget {
  const deadline = Date.now() + ms;
  return { remaining: () => deadline - Date.now() };
}

async function searchPlanit(
  params: Record<string, string>,
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<PlanItResponse> {
  const qs = new URLSearchParams({
    pg_sz: '200', start_date: '2000-01-01', end_date: '2026-12-31', ...params,
  }).toString();
  const res = await fetchWithRetry(
    `${PLANIT_URL}?${qs}`,
    { headers: { 'User-Agent': USER_AGENT } },
    { timeoutMs: opts.timeoutMs ?? 18000, retries: opts.retries ?? 2 },
  );
  if (!res.ok) return { records: [] };
  return (await res.json().catch(() => ({}))) as PlanItResponse;
}

function bbox(lat: number, lon: number, halfKm = 0.4): string {
  const dLat = halfKm / 111.0;
  const dLon = halfKm / (111.0 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return `${(lon - dLon).toFixed(5)},${(lat - dLat).toFixed(5)},${(lon + dLon).toFixed(5)},${(lat + dLat).toFixed(5)}`;
}

function planitToCandidate(rec: PlanItRecord): Candidate | null {
  const docsUrl = deriveDocsUrl(rec);
  if (!docsUrl) return null;
  return {
    reference: rec.uid ?? null,
    address: rec.address ?? '',
    description: (rec.description ?? rec.address ?? 'Planning application').slice(0, 200),
    appType: rec.app_type ?? null,
    applicationUrl: rec.url ?? docsUrl,
    docsUrl,
    nDocuments: rec.other_fields?.n_documents ?? null,
  };
}

/** PlanWire fallback (more reliable than PlanIt). Behind PLANWIRE_API_KEY; mapping confirmed at integration. */
async function planwireSearch(postcode: string): Promise<Candidate[]> {
  const key = process.env.PLANWIRE_API_KEY;
  if (!key) return [];
  const base = (process.env.PLANWIRE_BASE_URL || 'https://api.planwire.io').replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetchWithRetry(
      `${base}/v1/applications?postcode=${encodeURIComponent(postcode)}`,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } },
      { timeoutMs: 15000, retries: 2 },
    );
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as {
    applications?: unknown[]; records?: unknown[]; data?: unknown[];
  } | null;
  const rows = (body?.applications ?? body?.records ?? body?.data ?? []) as Record<string, unknown>[];
  return rows
    .map((r): Candidate | null => {
      const url = String(r.url ?? r.source_url ?? r.link ?? '');
      if (!url) return null;
      return {
        reference: (r.reference ?? r.ref ?? r.uid ?? null) as string | null,
        address: String(r.address ?? ''),
        description: String(r.description ?? r.proposal ?? r.address ?? 'Planning application').slice(0, 200),
        appType: (r.app_type ?? r.type ?? null) as string | null,
        applicationUrl: url,
        docsUrl: toDocsUrl(url),
        nDocuments: (r.n_documents ?? null) as number | null,
      };
    })
    .filter((c): c is Candidate => c !== null);
}

// `clean` = at least one provider completed without throwing (so an empty result is a genuine
// "found none", not a transient failure). Only clean results are cached as a hit.
type DiscoverOutcome = { source: DiscoverySource; candidates: Candidate[]; clean: boolean };

/** Human-readable names for the discovery sources, for logs. */
const SOURCE_LABEL: Record<DiscoverySource, string> = {
  idox: 'AccessCheck direct (Idox council portal)',
  northgate: 'AccessCheck direct (Northgate council portal)',
  planwire: 'PlanWire',
  planit: 'PlanIt',
  none: 'none',
};

/** Ordered discovery: direct Idox -> PlanIt -> PlanWire. First source with candidates wins. */
async function discoverCandidates(
  args: { portal: CouncilPortal | null; postcode: string; pcn: string; address: string; lat: number | null; lon: number | null },
  budget: TimeBudget,
): Promise<DiscoverOutcome> {
  const { portal, pcn, address, lat, lon } = args;
  let clean = false;

  // 1. Direct council portal (Idox) — our own scraper ("AccessCheck direct").
  if (portal && portal.software === 'idox' && budget.remaining() > MIN_STAGE_MS) {
    console.info(`[floorplans] ${pcn}: trying ${SOURCE_LABEL.idox} → ${portal.baseUrl}`);
    const adapter = ADAPTERS.find((a) => a.name === 'idox');
    try {
      const candidates = (await adapter?.search?.(portal, pcn, address)) ?? [];
      clean = true;
      if (candidates.length) {
        console.info(`[floorplans] ${pcn}: ✓ using ${SOURCE_LABEL.idox} — ${candidates.length} application(s)`);
        return { source: 'idox', candidates, clean };
      }
      console.info(`[floorplans] ${pcn}: ${SOURCE_LABEL.idox} returned 0 — falling back`);
    } catch (err) {
      console.warn(`[floorplans] ${pcn}: ${SOURCE_LABEL.idox} failed for ${portal.baseUrl}: ${(err as Error)?.message}`);
    }
  } else {
    console.info(
      `[floorplans] ${pcn}: no direct council portal (${portal ? `software='${portal.software}'` : 'unknown council'}) — using an aggregator`,
    );
  }

  // 2. PlanIt (free, broad coverage — preferred fallback when direct search finds nothing).
  if (budget.remaining() > MIN_STAGE_MS) {
    console.info(`[floorplans] ${pcn}: trying ${SOURCE_LABEL.planit}`);
    try {
      let data = await searchPlanit({ pcode: pcn, krad: '0.4' });
      if ((data.records?.length ?? 0) < 3 && lat != null && lon != null && budget.remaining() > MIN_STAGE_MS) {
        data = await searchPlanit({ bbox: bbox(lat, lon) });
      }
      clean = true;
      const candidates = (data.records ?? [])
        .map(planitToCandidate)
        .filter((c): c is Candidate => c !== null);
      if (candidates.length) {
        console.info(`[floorplans] ${pcn}: ✓ using ${SOURCE_LABEL.planit} — ${candidates.length} application(s)`);
        return { source: 'planit', candidates, clean };
      }
      console.info(`[floorplans] ${pcn}: ${SOURCE_LABEL.planit} returned 0 — falling back`);
    } catch (err) {
      console.warn(`[floorplans] ${pcn}: ${SOURCE_LABEL.planit} failed: ${(err as Error)?.message}`);
    }
  }

  // 3. PlanWire (optional last resort — requires PLANWIRE_API_KEY).
  if (process.env.PLANWIRE_API_KEY && budget.remaining() > MIN_STAGE_MS) {
    console.info(`[floorplans] ${pcn}: trying ${SOURCE_LABEL.planwire}`);
    try {
      const candidates = await planwireSearch(pcn);
      clean = true;
      if (candidates.length) {
        console.info(`[floorplans] ${pcn}: ✓ using ${SOURCE_LABEL.planwire} — ${candidates.length} application(s)`);
        return { source: 'planwire', candidates, clean };
      }
      console.info(`[floorplans] ${pcn}: ${SOURCE_LABEL.planwire} returned 0`);
    } catch (err) {
      console.warn(`[floorplans] ${pcn}: ${SOURCE_LABEL.planwire} failed: ${(err as Error)?.message}`);
    }
  }

  console.info(`[floorplans] ${pcn}: no source returned candidates`);
  return { source: 'none', candidates: [], clean };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
/**
 * Find candidate floor plans for the property's EXACT address. Checks the per-postcode cache first,
 * else discovers (Idox -> PlanIt -> PlanWire), matches strictly to the door number + street, scrapes
 * plan PDFs, and persists the whole postcode's applications to the shared cache for reuse.
 */
export async function findFloorplans(
  input: { postcode: string; address: string; uprn?: string | null; lat?: number | null; lon?: number | null },
  deps: FindFloorplansDeps,
): Promise<FloorplanResult> {
  const { db } = deps;
  const ttlMs = deps.cacheTtlMs ?? DEFAULT_TTL_MS;
  const budget = newBudget(BUDGET_MS);

  const pc = await lookupPostcode(input.postcode);
  const pcn = pc?.postcode_normalised ?? normalisePostcode(input.postcode);
  const outcode = pcn.split(' ')[0] ?? null;
  const lat = input.lat ?? pc?.latitude ?? null;
  const lon = input.lon ?? pc?.longitude ?? null;
  const council = pc?.local_authority ?? null;
  const lpaCode = pc?.local_authority_code ?? null;
  // Freshness is tracked per ADDRESS (not postcode): each address does its own search + extraction.
  const addressKey = addressCacheKey(input.uprn, input.address, pcn);

  // 1. Cache hit for THIS address — re-match the cached postcode applications against the exact
  //    address (no network). A different address in the same postcode won't hit this; it searches itself.
  if (!deps.refresh) {
    const cached = await readSearchCache(db, addressKey);
    if (cached && cached.status === 'ok' && isFresh(cached.searchedAt, ttlMs)) {
      console.info(
        `[floorplans] ${pcn}: cache hit — serving cached results (originally discovered via ${SOURCE_LABEL[cached.source]}); pass refresh to re-discover`,
      );
      const r = await loadCachedResult(db, pcn, input.address, outcode);
      return { plans: r.plans, applications: r.applications, council: r.council ?? council };
    }
  }

  // 2. Resolve the council's portal (null -> aggregator fallback inside discoverCandidates).
  const portal = await getPortalForCouncil(db, lpaCode, council);

  // 3. Discover the postcode's applications.
  const { source, candidates, clean } = await discoverCandidates(
    { portal, postcode: input.postcode, pcn, address: input.address, lat, lon },
    budget,
  );

  // 4. Score + split: exact matches (this property) vs nearby (same postcode, different address).
  const scored = candidates.map((c) => ({ c, score: addressScore(input.address, c.address, outcode) }));
  const exact = scored
    .filter((s) => isExactAddressMatch(input.address, s.c.address, outcode))
    .sort((a, b) => b.score - a.score);
  const exactSet = new Set(exact.map((e) => e.c));
  const nearby = scored
    .filter((s) => !exactSet.has(s.c))
    .sort(
      (a, b) =>
        b.score - a.score ||
        relevanceScore(b.c.description, b.c.appType, b.c.nDocuments) -
          relevanceScore(a.c.description, a.c.appType, a.c.nDocuments),
    );

  // 5. Work list, closest address first: exact matches (this property), then the most relevant
  //    nearby applications. We scrape EVERY document from the top MAX_EXTRACT of these (extraction is
  //    the expensive, per-application network step, so it's budget-bound) and surface up to
  //    MAX_SURFACE application links so the full PlanIt result set (up to ~200) is browsable.
  //    The UI categorises extracted docs by description into Floor plans / Others tabs.
  const ordered = [...exact, ...nearby];
  const docsByCandidate = new Map<Candidate, PortalDoc[]>();
  const plans: FoundPlan[] = [];
  const applications: FoundApplication[] = [];
  let portalFetches = 0;
  // Scrape documents from the EXACT-address applications only — these become this property's floor
  // plans (shown in the Floor plans / Others tabs).
  for (const { c, score } of exact.slice(0, MAX_EXTRACT)) {
    let docs: PortalDoc[] = [];
    const adapter = getAdapter(c.docsUrl);
    if (adapter && budget.remaining() > MIN_STAGE_MS) {
      if (portalFetches > 0) await sleep(PORTAL_DELAY_MS);
      portalFetches++;
      try {
        docs = await adapter.extract(c.docsUrl);
      } catch (err) {
        console.warn(`[floorplans] extract failed for ${c.docsUrl}: ${(err as Error)?.message}`);
      }
    }
    docsByCandidate.set(c, docs);
    for (const p of docs) {
      plans.push({ description: p.description, url: p.url, docsUrl: c.docsUrl, application: c.reference, council, matchScore: score, exact: true });
    }
    applications.push({
      description: c.description, url: c.docsUrl || c.applicationUrl, application: c.reference,
      council, matchScore: score, extracted: docs.length > 0, exact: true,
    });
  }
  // Nearby same-postcode applications are NOT surfaced — only this exact address's plans + application
  // are shown. (They're still persisted below to build the shared discovery index.)

  // 7. Persist the whole postcode's discovery to the shared cache (reused by other addresses).
  try {
    const ranked = ordered
      .slice(0, MAX_PERSIST)
      .map(({ c, score }) => ({ candidate: c, score, plans: docsByCandidate.get(c) ?? [] }));
    // Cache as a hit ('ok') only when a provider completed cleanly (candidates, or a genuine empty).
    // All-failed -> 'error' (retried next time); no portal and no fallback ran -> 'no_portal'.
    const status: 'ok' | 'no_portal' | 'error' =
      candidates.length || clean ? 'ok' : portal ? 'error' : 'no_portal';
    await persistDiscovery(db, {
      addressKey,
      postcodeNormalised: pcn,
      lpaCode,
      council,
      source,
      status,
      ranked,
    });
  } catch (err) {
    console.error(`[floorplans] persist failed for ${pcn}: ${(err as Error)?.message}`);
  }

  // De-dupe by URL.
  const seenPlans = new Set<string>();
  const uniquePlans = plans.filter((p) => (seenPlans.has(p.url) ? false : (seenPlans.add(p.url), true)));
  const seenApps = new Set<string>();
  const uniqueApps = applications.filter((a) => (seenApps.has(a.url) ? false : (seenApps.add(a.url), true)));

  return { plans: uniquePlans, applications: uniqueApps, council };
}
