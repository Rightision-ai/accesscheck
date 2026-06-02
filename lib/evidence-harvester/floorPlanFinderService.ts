/**
 * floorPlanFinderService — find candidate floor-plan PDFs for a property from UK council planning
 * portals (public records). TypeScript port of the property_docs.py / find_property_docs.py prototype.
 *
 * Pipeline:  postcode -> PlanIt search -> triage by relevance -> match the target address
 *            -> per-portal-software adapter (Idox / Northgate) scrapes the documents page
 *            -> filter to plan/elevation PDFs.
 *
 * Coverage is partial (only properties with planning applications that have documents) and matches
 * are at building/street level, so results are CANDIDATES, never ground truth. Server-only.
 */
import * as cheerio from 'cheerio';
import { fetchWithRetry } from './http';
import { lookupPostcode } from './postcodesService';

const PLANIT_URL = 'https://www.planit.org.uk/api/applics/json';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HTML_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const PORTAL_DELAY_MS = 800; // be polite to council servers
const MAX_CANDIDATES = 5;

// ---------------------------------------------------------------------------
// PlanIt record shape
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

export type FoundPlan = {
  description: string;
  url: string;            // the raw file URL (often session-bound — serve via the proxy route)
  docsUrl: string;        // the application documents page (used to establish the portal session)
  application: string | null;
  council: string | null;
  matchScore: number;
};
/** A candidate planning application page (works for any council via PlanIt, even ones we can't scrape). */
export type FoundApplication = {
  description: string;
  url: string;            // the council application/documents page
  application: string | null;
  council: string | null;
  matchScore: number;
  extracted: boolean;     // did we manage to auto-pull plan PDFs from it?
};
export type FloorplanResult = {
  plans: FoundPlan[];
  applications: FoundApplication[];
  council: string | null;
};

// ---------------------------------------------------------------------------
// Stage 1 — triage (portal-agnostic relevance scoring)
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

function deriveDocsUrl(rec: PlanItRecord): string | null {
  const of = rec.other_fields ?? {};
  if (of.docs_url) return of.docs_url;
  if (rec.url) return rec.url.replace('activeTab=summary', 'activeTab=documents');
  return null;
}

/** Relevance score: prefer applications likely to contain plans (extensions, floor plans, access works). */
function relevanceScore(rec: PlanItRecord): number {
  const of = rec.other_fields ?? {};
  const nDocs = of.n_documents ?? 0;
  const desc = (rec.description ?? '').toLowerCase();
  let s = PLAN_SIGNALS.reduce((acc, [pat, w]) => (pat.test(desc) ? acc + w : acc), 0);
  s += TYPE_WEIGHT[rec.app_type ?? ''] ?? 0;
  s += Math.min(nDocs, 20) * 0.15;
  return s;
}

// ---------------------------------------------------------------------------
// Address matching (building/street weighted; the unit number barely counts)
// ---------------------------------------------------------------------------
const ABBREV: Record<string, string> = {
  rd: 'road', st: 'street', ave: 'avenue', av: 'avenue', ln: 'lane', cl: 'close',
  ct: 'court', dr: 'drive', ho: 'house', hse: 'house', apt: 'apartment', fl: 'flat',
};
const GENERIC = new Set([
  'road', 'street', 'avenue', 'lane', 'close', 'court', 'drive', 'house', 'apartment',
  'flat', 'the', 'of', 'at', 'land', 'to', 'adjacent', 'former', 'site', 'london', 'england', 'uk',
]);
const UK_POSTCODE = /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/gi;

function addrTokens(s: string, dropOutcode?: string | null): string[] {
  let t = s.toLowerCase().replace(UK_POSTCODE, ' ');
  if (dropOutcode) t = t.replace(new RegExp(`\\b${dropOutcode.toLowerCase()}\\b`, 'g'), ' ');
  t = t.replace(/[^a-z0-9 ]/g, ' ');
  return t.split(/\s+/).filter(Boolean).map((w) => ABBREV[w] ?? w);
}

export function addressScore(target: string, candidate: string, outcode?: string | null): number {
  const t = addrTokens(target, outcode);
  const c = new Set(addrTokens(candidate, outcode));
  const tWords = t.filter((w) => !/^\d+$/.test(w));
  const tNums = new Set(t.filter((w) => /^\d+$/.test(w)));
  const cNums = new Set([...c].filter((w) => /^\d+$/.test(w)));
  if (tWords.length === 0) return 0;
  let num = 0, den = 0;
  for (const w of new Set(tWords)) {
    const wt = GENERIC.has(w) ? 0.4 : 1.0;
    den += wt;
    if (c.has(w)) num += wt;
  }
  let score = den ? (num / den) * 100 : 0;
  if (tNums.size && [...tNums].some((n) => cNums.has(n))) score = Math.min(100, score + 10);
  return Math.round(score * 10) / 10;
}

// ---------------------------------------------------------------------------
// Stage 2 — per-software portal adapters
// ---------------------------------------------------------------------------
const PLAN_DOC_TYPES =
  /floor ?plan|proposed plan|existing plan|elevation|section|block plan|site plan|location plan|general arrangement/i;

type PortalDoc = { description: string; url: string };

interface PortalAdapter {
  name: string;
  matches(url: string): boolean;
  extract(docsUrl: string): Promise<PortalDoc[]>;
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

async function fetchHtml(url: string): Promise<string> {
  const res = await fetchWithRetry(url, { headers: HTML_HEADERS }, { timeoutMs: 30000 });
  if (!res.ok) throw new Error(`portal ${res.status}`);
  return res.text();
}

/** Idox Public Access — /online-applications/ (most UK councils). */
const idoxAdapter: PortalAdapter = {
  name: 'idox',
  matches: (url) => /\/online-applications\//i.test(url),
  async extract(docsUrl) {
    const html = await fetchHtml(docsUrl);
    return anchorsToDocs(html, docsUrl, (h) => h.includes('/files/') || h.toLowerCase().endsWith('.pdf'));
  },
};

/** Northgate / NEC Planning Explorer — /PlanningExplorer/. Routes downloads through handlers. */
const northgateAdapter: PortalAdapter = {
  name: 'northgate',
  matches: (url) => /\/PlanningExplorer\/|\/Northgate\/|\/generic\//i.test(url),
  async extract(docsUrl) {
    const html = await fetchHtml(docsUrl);
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
// PlanIt search + orchestration
// ---------------------------------------------------------------------------
async function searchPlanit(params: Record<string, string>): Promise<PlanItResponse> {
  const qs = new URLSearchParams({
    pg_sz: '200', start_date: '2000-01-01', end_date: '2026-12-31', ...params,
  }).toString();
  const res = await fetchWithRetry(`${PLANIT_URL}?${qs}`, { headers: { 'User-Agent': USER_AGENT } }, { timeoutMs: 40000 });
  // PlanIt returns 400 "No location found" for postcodes it hasn't geocoded (common for new-build
  // postcodes). Treat any non-2xx as "no records" so the caller falls through to the bbox search.
  if (!res.ok) return { records: [] };
  return (await res.json().catch(() => ({}))) as PlanItResponse;
}

function bbox(lat: number, lon: number, halfKm = 0.4): string {
  const dLat = halfKm / 111.0;
  const dLon = halfKm / (111.0 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return `${(lon - dLon).toFixed(5)},${(lat - dLat).toFixed(5)},${(lon + dLon).toFixed(5)},${(lat + dLat).toFixed(5)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Find candidate floor-plan PDFs for an address. Uses the property's stored address + postcode.
 * Provide lat/lon to skip the postcode lookup; otherwise it resolves them via Postcodes.io.
 */
export async function findFloorplans(input: {
  postcode: string;
  address: string;
  lat?: number | null;
  lon?: number | null;
}): Promise<FloorplanResult> {
  const pc = await lookupPostcode(input.postcode);
  const lat = input.lat ?? pc?.latitude ?? null;
  const lon = input.lon ?? pc?.longitude ?? null;
  const outcode = pc?.postcode_normalised?.split(' ')[0] ?? null;
  const council = pc?.local_authority ?? null;

  // PlanIt by postcode+radius; fall back to bbox when sparse (e.g. brand-new postcodes).
  let data = await searchPlanit({ pcode: pc?.postcode_normalised ?? input.postcode, krad: '0.4' });
  if ((data.records?.length ?? 0) < 3 && lat != null && lon != null) {
    data = await searchPlanit({ bbox: bbox(lat, lon) });
  }
  const records = data.records ?? [];

  // Rank by address similarity; fall back to nearest-by-distance when nothing matches.
  let ranked = records
    .map((rec) => ({ score: addressScore(input.address, rec.address ?? '', outcode), rec }))
    .filter((x) => x.score >= 35)
    .sort(
      (a, b) =>
        b.score - a.score ||
        relevanceScore(b.rec) - relevanceScore(a.rec) ||
        Number(a.rec.distance ?? 9e9) - Number(b.rec.distance ?? 9e9),
    );
  if (ranked.length === 0) {
    // No address match — fall back to the most relevant nearby applications (likely to hold plans).
    ranked = [...records]
      .sort(
        (a, b) =>
          relevanceScore(b) - relevanceScore(a) || Number(a.distance ?? 9e9) - Number(b.distance ?? 9e9),
      )
      .slice(0, MAX_CANDIDATES)
      .map((rec) => ({ score: 0, rec }));
  }

  const plans: FoundPlan[] = [];
  const applications: FoundApplication[] = [];

  let portalFetches = 0;
  for (const { score, rec } of ranked.slice(0, MAX_CANDIDATES)) {
    const docsUrl = deriveDocsUrl(rec);
    if (!docsUrl) continue;
    const recCouncil = rec.area_name ?? council;
    const recDesc = (rec.description ?? rec.address ?? 'Planning application').slice(0, 200);

    // Always record the application page — this is what makes the feature work nationally: PlanIt
    // covers ~420 councils, so even where we can't auto-scrape the PDFs we hand the user a direct link.
    const appEntry: FoundApplication = {
      description: recDesc, url: docsUrl, application: rec.uid ?? null,
      council: recCouncil, matchScore: score, extracted: false,
    };

    const adapter = getAdapter(docsUrl);
    if (adapter) {
      if (portalFetches > 0) await sleep(PORTAL_DELAY_MS);
      portalFetches++;
      try {
        const docs = await adapter.extract(docsUrl);
        const hits = filterPlans(docs);
        for (const p of hits) {
          plans.push({ description: p.description, url: p.url, docsUrl, application: rec.uid ?? null, council: recCouncil, matchScore: score });
        }
        appEntry.extracted = hits.length > 0;
      } catch {
        // portal fetch failed — still surface the application page for manual viewing
      }
    }
    applications.push(appEntry);
  }

  // De-dupe by URL.
  const seenPlans = new Set<string>();
  const uniquePlans = plans.filter((p) => (seenPlans.has(p.url) ? false : (seenPlans.add(p.url), true)));
  const seenApps = new Set<string>();
  const uniqueApps = applications.filter((a) => (seenApps.has(a.url) ? false : (seenApps.add(a.url), true)));

  return { plans: uniquePlans, applications: uniqueApps, council };
}
