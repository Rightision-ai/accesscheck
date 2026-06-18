/**
 * planningCacheService — all shared-table I/O for floor-plan discovery: the per-postcode freshness
 * cache (`planning_searches`), the accumulating application/document index (`planning_applications`,
 * `planning_application_documents`), and background caching of the actual PDF bytes into the
 * `planning-docs` bucket.
 *
 * Discovery is cached at POSTCODE-AREA level (one portal search returns every application in the
 * postcode, reused by all addresses in it); the per-address result is computed by re-matching those
 * cached applications against the exact target address on read. All writes use the service-role
 * client (the tables are read-only to authenticated users).
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Candidate, FoundApplication, FoundPlan, PortalDoc } from './floorPlanFinderService';
import { addressScore, isExactAddressMatch } from './addressUtils';
import { fetchPortalFile } from './portalSession';

type Db = SupabaseClient<Database>;

const PLANNING_DOCS_BUCKET = 'planning-docs';
const MAX_APPLICATIONS = 50; // how many same-postcode applications to surface (PlanIt returns up to ~200)

export type DiscoverySource = 'idox' | 'northgate' | 'planwire' | 'planit' | 'none';
export type SearchStatus = 'ok' | 'no_portal' | 'error';

export type CachedSearch = {
  status: SearchStatus;
  source: DiscoverySource;
  applicationCount: number;
  searchedAt: string;
};

/**
 * Stable per-ADDRESS cache key: the UPRN when known (the exact-address identifier), otherwise the
 * normalised address + postcode. Floor-plan discovery/extraction is address-specific, so freshness is
 * tracked per address — a second address in the same postcode does its own search.
 */
export function addressCacheKey(
  uprn: string | null | undefined,
  address: string,
  postcodeNormalised: string,
): string {
  if (uprn) return `uprn:${uprn}`;
  const norm = (address ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `addr:${norm}|${postcodeNormalised}`;
}

/** Read the per-address freshness row; null = this address was never searched. */
export async function readSearchCache(db: Db, addressKey: string): Promise<CachedSearch | null> {
  const { data } = await db
    .from('planning_searches')
    .select('status, source, application_count, searched_at')
    .eq('address_key', addressKey)
    .maybeSingle();
  if (!data) return null;
  return {
    status: data.status as SearchStatus,
    source: data.source as DiscoverySource,
    applicationCount: data.application_count,
    searchedAt: data.searched_at,
  };
}

export function isFresh(searchedAt: string, ttlMs: number): boolean {
  return Date.now() - new Date(searchedAt).getTime() < ttlMs;
}

function classifyDocKind(description: string): string {
  const d = description.toLowerCase();
  if (/floor ?plan/.test(d)) return 'floor_plan';
  if (/elevation|section/.test(d)) return 'elevation';
  if (/site plan|location plan|block plan/.test(d)) return 'site';
  return 'other';
}

/**
 * Build the per-address result from the postcode's cached applications. Applications are ranked by
 * address similarity (closest to the target first); every stored document becomes a "plan" tagged
 * with its application's match score, and up to MAX_APPLICATIONS application links are surfaced so
 * the full discovered set is browsable.
 */
export async function loadCachedResult(
  db: Db,
  postcodeNormalised: string,
  targetAddress: string,
  outcode: string | null,
): Promise<{ plans: FoundPlan[]; applications: FoundApplication[]; council: string | null }> {
  const { data: apps } = await db
    .from('planning_applications')
    .select('id, council, reference, address, description, application_url, docs_url')
    .eq('postcode_normalised', postcodeNormalised);
  if (!apps || apps.length === 0) return { plans: [], applications: [], council: null };

  const ranked = apps
    .map((a) => ({ a, score: addressScore(targetAddress, a.address ?? '', outcode) }))
    .sort((x, y) => y.score - x.score);
  const top = ranked.slice(0, MAX_APPLICATIONS);

  // Pull stored documents for the surfaced applications in one query.
  const docsByApp = new Map<string, { description: string | null; doc_url: string }[]>();
  const topIds = top.map((t) => t.a.id);
  if (topIds.length) {
    const { data: docs } = await db
      .from('planning_application_documents')
      .select('application_id, description, doc_url')
      .in('application_id', topIds);
    for (const d of docs ?? []) {
      const list = docsByApp.get(d.application_id) ?? [];
      list.push({ description: d.description, doc_url: d.doc_url });
      docsByApp.set(d.application_id, list);
    }
  }

  // Plans = stored documents from applications that EXACTLY match this address (door/building number
  // + street), so a neighbour's plans in the same postcode are never shown as this property's.
  const plans: FoundPlan[] = [];
  for (const { a, score } of top) {
    if (!isExactAddressMatch(targetAddress, a.address ?? '', outcode)) continue;
    for (const doc of docsByApp.get(a.id) ?? []) {
      plans.push({
        description: doc.description ?? 'Plan',
        url: doc.doc_url,
        docsUrl: a.docs_url ?? a.application_url ?? '',
        application: a.reference,
        council: a.council,
        matchScore: score,
        exact: true,
      });
    }
  }

  // Applications: only this EXACT address's application(s) — nearby postcode applications are not shown.
  const applications: FoundApplication[] = [];
  const seen = new Set<string>();
  for (const { a, score } of top) {
    if (!isExactAddressMatch(targetAddress, a.address ?? '', outcode)) continue;
    const url = a.docs_url ?? a.application_url ?? '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    applications.push({
      description: a.description ?? a.address ?? 'Planning application',
      url,
      application: a.reference,
      council: a.council,
      matchScore: score,
      extracted: (docsByApp.get(a.id)?.length ?? 0) > 0,
      exact: true,
    });
  }

  return { plans, applications, council: apps[0]?.council ?? null };
}

/**
 * Persist a discovery result to the shared cache. Upserts one row per application, their plan docs,
 * and the per-ADDRESS freshness row. `ranked[].plans` are the extracted plan/elevation docs for that app.
 */
export async function persistDiscovery(
  db: Db,
  args: {
    addressKey: string;
    postcodeNormalised: string;
    lpaCode: string | null;
    council: string | null;
    source: DiscoverySource;
    status: SearchStatus;
    error?: string | null;
    ranked: { candidate: Candidate; score: number; plans: PortalDoc[] }[];
  },
): Promise<void> {
  const now = new Date().toISOString();
  // Always non-null lpa_code so the (lpa_code, reference) unique constraint can dedupe. Fallback
  // sources without a GSS code get a synthetic key.
  const lpaKey =
    args.lpaCode ?? `${args.source}:${(args.council ?? args.postcodeNormalised).toLowerCase()}`;

  for (const item of args.ranked) {
    const c = item.candidate;
    const reference = c.reference || c.applicationUrl; // stable dedupe key when the portal omits a ref
    const { data: appRow } = await db
      .from('planning_applications')
      .upsert(
        {
          lpa_code: lpaKey,
          council: args.council,
          reference,
          address: c.address,
          postcode_normalised: args.postcodeNormalised,
          description: c.description,
          app_type: c.appType,
          application_url: c.applicationUrl,
          docs_url: c.docsUrl,
          software: args.source,
          n_documents: c.nDocuments,
          last_checked_at: now,
        },
        { onConflict: 'lpa_code,reference' },
      )
      .select('id')
      .single();
    if (!appRow) continue;

    if (item.plans.length) {
      await db.from('planning_application_documents').upsert(
        item.plans.map((p) => ({
          application_id: appRow.id,
          description: p.description,
          doc_url: p.url,
          doc_kind: classifyDocKind(p.description),
        })),
        { onConflict: 'application_id,doc_url' },
      );
    }
  }

  await db.from('planning_searches').upsert(
    {
      address_key: args.addressKey,
      postcode_normalised: args.postcodeNormalised,
      lpa_code: args.lpaCode,
      source: args.source,
      status: args.status,
      application_count: args.ranked.length,
      error: args.error ?? null,
      searched_at: now,
    },
    { onConflict: 'address_key' },
  );
}

function extFor(mime: string): string {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  return 'jpg';
}

/**
 * Upload already-fetched document bytes to the planning-docs bucket and record the path on every
 * matching (not-yet-cached) document row. Returns the stored path, or null on failure.
 */
export async function cacheDocBytes(
  db: Db,
  docUrl: string,
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  const path = `docs/${createHash('sha1').update(docUrl).digest('hex')}.${extFor(mime)}`;
  const { error } = await db.storage.from(PLANNING_DOCS_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: true,
  });
  if (error) return null;
  await db.from('planning_application_documents').update({ stored_path: path }).eq('doc_url', docUrl).is('stored_path', null);
  return path;
}

/**
 * Download not-yet-cached plan documents for a postcode and store the bytes in the planning-docs
 * bucket (so repeat opens are served from our storage, never the council). Runs in the route's
 * after() task, so a failure here never affects the user's response. Files are session-bound, so
 * fetchPortalFile re-establishes the portal session (cookie jar across redirects) per document.
 */
export async function storePlanDocsInBackground(db: Db, postcodeNormalised: string): Promise<void> {
  const { data: docs } = await db
    .from('planning_application_documents')
    .select('id, doc_url, stored_path, planning_applications!inner(docs_url, postcode_normalised)')
    .is('stored_path', null)
    .eq('planning_applications.postcode_normalised', postcodeNormalised)
    .limit(20);
  if (!docs || docs.length === 0) return;

  for (const doc of docs) {
    // The nested relation comes back as an object (single FK); guard for the array shape too.
    const rel = doc.planning_applications as unknown as { docs_url: string | null } | { docs_url: string | null }[] | null;
    const docsUrl = Array.isArray(rel) ? rel[0]?.docs_url : rel?.docs_url;
    try {
      const file = await fetchPortalFile(docsUrl ?? null, doc.doc_url);
      if (!file) continue;
      await cacheDocBytes(db, doc.doc_url, file.buffer, file.contentType);
    } catch {
      /* best-effort cache; skip this doc */
    }
  }
}
