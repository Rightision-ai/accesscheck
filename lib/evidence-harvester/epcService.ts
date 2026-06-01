/**
 * EpcService — UPRN + property intelligence from the EPC API.
 *
 * Targets the current "Get energy performance of buildings data" service
 * (https://api.get-energy-performance-data.communities.gov.uk), documented at
 * https://get-energy-performance-data.communities.gov.uk/api-technical-documentation.
 *
 * Auth is a Bearer token (EPC_API_KEY). Two steps:
 *   1. GET /api/domestic/search — returns lean camelCase summaries (uprn, energy band, address,
 *      certificateNumber) under `data[]`. We address-match these and pick the best.
 *   2. GET /api/certificate?certificate_number=… — returns the full underscore-keyed certificate,
 *      which is where property_type / built_form / total_floor_area / construction_age_band live.
 */
import { fetchWithRetry } from './http';
import { addressSimilarity } from './address';
import type { EpcMatch, EpcDetails } from './types';

const BASE_URL =
  process.env.EPC_API_BASE_URL || 'https://api.get-energy-performance-data.communities.gov.uk';

/** Lean summary row from /api/domestic/search. */
type EpcSummary = {
  certificateNumber?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  addressLine4?: string | null;
  postcode?: string | null;
  postTown?: string | null;
  council?: string | null;
  constituency?: string | null;
  currentEnergyEfficiencyBand?: string | null;
  registrationDate?: string | null;
  uprn?: number | string | null;
};

/** Full certificate from /api/certificate (underscore keys, some nested). */
type EpcCertificate = {
  uprn?: number | string | null;
  property_type?: string | null;
  built_form?: string | number | null;
  dwelling_type?: string | null;
  total_floor_area?: string | number | null;
  habitable_room_count?: number | null;
  heated_room_count?: number | null;
  extensions_count?: number | null;
  floors?: { description?: string | null }[] | null;
  registration_date?: string | null;
  inspection_date?: string | null;
  current_energy_efficiency_band?: string | null;
  potential_energy_efficiency_band?: string | null;
  energy_rating_current?: number | null;
  energy_rating_potential?: number | null;
  main_heating?: { description?: string | null }[] | string | null;
  postcode?: string | null;
  sap_building_parts?: { construction_age_band?: string | null }[] | null;
};

function authHeader(): string | null {
  // The new service uses a Bearer token. EPC_API_KEY holds that token (EPC_API_EMAIL is unused).
  const key = process.env.EPC_API_KEY;
  return key ? `Bearer ${key}` : null;
}

function authedHeaders(): HeadersInit {
  const auth = authHeader();
  if (!auth) throw new Error('EPC_API_KEY (Bearer token) is not configured.');
  return { Authorization: auth, Accept: 'application/json' };
}

async function searchDomestic(params: Record<string, string>): Promise<EpcSummary[]> {
  // `page` is the page SIZE (1–5000) in this API; `current_page` is the page number.
  const qs = new URLSearchParams({ page: '100', current_page: '1', ...params }).toString();
  const res = await fetchWithRetry(`${BASE_URL}/api/domestic/search?${qs}`, {
    headers: authedHeaders(),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`EPC search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json().catch(() => null)) as { data?: EpcSummary[] } | null;
  return body?.data ?? [];
}

export async function searchByUprn(uprn: string): Promise<EpcSummary[]> {
  return searchDomestic({ uprn });
}

export async function searchByPostcode(postcode: string): Promise<EpcSummary[]> {
  return searchDomestic({ postcode });
}

export type AddressOption = {
  address: string;
  uprn: string | null;
  certificateNumber: string | null;
  postcode: string | null;
};

/** Registered EPC addresses for a postcode — powers the single-property "pick an address" step. */
export async function listAddressesByPostcode(postcode: string): Promise<AddressOption[]> {
  const rows = await searchByPostcode(postcode);
  const seen = new Set<string>();
  const out: AddressOption[] = [];
  for (const r of rows) {
    const address = summaryAddress(r).replace(/\s+/g, ' ').trim();
    const key = `${address}|${r.uprn ?? ''}`;
    if (!address || seen.has(key)) continue;
    seen.add(key);
    const uprnVal = unwrap(r.uprn);
    const pcVal = unwrap(r.postcode);
    const certVal = unwrap(r.certificateNumber);
    out.push({
      address,
      uprn: uprnVal != null ? String(uprnVal) : null,
      certificateNumber: certVal != null ? String(certVal) : null,
      postcode: pcVal != null ? String(pcVal).replace(/\+/g, ' ') : null,
    });
  }
  return out.sort((a, b) => a.address.localeCompare(b.address, undefined, { numeric: true }));
}

/** Fetch the full certificate for the richer fields the search summary omits. Best-effort. */
export async function fetchCertificate(certificateNumber: string): Promise<EpcCertificate | null> {
  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/api/certificate?certificate_number=${encodeURIComponent(certificateNumber)}`,
      { headers: authedHeaders() },
    );
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { data?: EpcCertificate } | null;
    return body?.data ?? null;
  } catch {
    return null;
  }
}

// RdSAP enumerations — the new API returns these fields as codes for RdSAP certificates. Decode to
// readable labels (pass through anything already textual, e.g. older/SAP certificates).
const PROPERTY_TYPE: Record<string, string> = {
  '0': 'House', '1': 'Bungalow', '2': 'Flat', '3': 'Maisonette', '4': 'Park home',
};
const BUILT_FORM: Record<string, string> = {
  '1': 'Detached', '2': 'Semi-Detached', '3': 'End-Terrace', '4': 'Mid-Terrace',
  '5': 'Enclosed End-Terrace', '6': 'Enclosed Mid-Terrace', NR: 'Not Recorded',
};

/**
 * Some fields in the new EPC API come back as localised objects like { value, language } (for
 * English/Welsh). Unwrap those to the underlying scalar; pass primitives through unchanged.
 */
function unwrap(v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
    return (v as { value: unknown }).value;
  }
  return v;
}

function num(v: unknown): number | null {
  const u = unwrap(v);
  const n = typeof u === 'number' ? u : typeof u === 'string' ? Number(u) : NaN;
  return Number.isFinite(n) ? n : null;
}

function decode(map: Record<string, string>, value: unknown): string | null {
  const v = unwrap(value);
  if (v == null) return null;
  const key = String(v);
  return map[key] ?? key;
}

function summaryAddress(s: EpcSummary): string {
  return [s.addressLine1, s.addressLine2, s.addressLine3, s.addressLine4, s.postTown, s.postcode]
    .map((v) => unwrap(v))
    .filter((v): v is string | number => v != null && v !== '')
    .map(String)
    .join(' ');
}

function latest(a: EpcSummary, b: EpcSummary): EpcSummary {
  return (b.registrationDate ?? '') > (a.registrationDate ?? '') ? b : a;
}

/**
 * Pick the best summary for an uploaded address. A direct UPRN search is treated as a strong
 * identity match; otherwise the highest address-similarity row wins (ties broken by recency).
 * Returns the row plus a 0–1 confidence, or null when nothing matches well enough.
 */
export function selectBestMatch(
  rows: EpcSummary[],
  uploadedAddress: string,
  opts: { fromUprn?: boolean } = {},
): { row: EpcSummary; confidence: number } | null {
  if (rows.length === 0) return null;

  if (opts.fromUprn) {
    return { row: rows.reduce(latest), confidence: 0.85 };
  }

  let bestRow: EpcSummary | null = null;
  let bestSim = 0;
  for (const row of rows) {
    const sim = addressSimilarity(uploadedAddress, summaryAddress(row));
    if (sim > bestSim || (sim === bestSim && bestRow && latest(bestRow, row) === row)) {
      bestSim = sim;
      bestRow = row;
    }
  }
  if (!bestRow || bestSim < 0.34) return null;

  // Map similarity onto the spec's 0.50–0.90 EPC address-match band.
  const confidence = Number(Math.min(0.9, 0.5 + bestSim * 0.4).toFixed(2));
  return { row: bestRow, confidence };
}

function buildDetails(cert: EpcCertificate | null): EpcDetails | null {
  if (!cert) return null;
  const str = (v: unknown): string | null => {
    const u = unwrap(v);
    return u == null ? null : String(u);
  };
  const mainHeating = Array.isArray(cert.main_heating)
    ? cert.main_heating.map((h) => str(h?.description)).filter(Boolean).join('; ') || null
    : str(cert.main_heating);
  return {
    dwelling_type: str(cert.dwelling_type),
    habitable_room_count: num(cert.habitable_room_count),
    heated_room_count: num(cert.heated_room_count),
    extensions_count: num(cert.extensions_count),
    floor_descriptions: Array.isArray(cert.floors)
      ? cert.floors.map((f) => str(f?.description)).filter((d): d is string => Boolean(d))
      : [],
    energy_rating_current: num(cert.energy_rating_current),
    energy_rating_potential: num(cert.energy_rating_potential),
    potential_energy_band: str(cert.potential_energy_efficiency_band),
    main_heating: mainHeating,
  };
}

function buildMatch(summary: EpcSummary, cert: EpcCertificate | null, confidence: number): EpcMatch {
  const str = (v: unknown): string | null => {
    const u = unwrap(v);
    return u == null ? null : String(u);
  };
  return {
    uprn: str(summary.uprn ?? cert?.uprn),
    lmk_key: str(summary.certificateNumber),
    address: summaryAddress(summary) || null,
    postcode: str(summary.postcode ?? cert?.postcode)?.replace(/\+/g, ' ') ?? null,
    property_type: decode(PROPERTY_TYPE, cert?.property_type),
    built_form: decode(BUILT_FORM, cert?.built_form),
    total_floor_area: str(cert?.total_floor_area),
    construction_age_band: str(cert?.sap_building_parts?.[0]?.construction_age_band),
    lodgement_date: str(cert?.registration_date ?? summary.registrationDate),
    inspection_date: str(cert?.inspection_date),
    local_authority: str(summary.council),
    current_energy_rating: str(summary.currentEnergyEfficiencyBand ?? cert?.current_energy_efficiency_band),
    match_confidence: confidence,
    details: buildDetails(cert),
  };
}

/** Full search-then-match-then-enrich: by UPRN first if available, else by postcode. */
export async function findBestEpc(args: {
  uprn?: string | null;
  postcode: string;
  address: string;
}): Promise<EpcMatch | null> {
  let best: { row: EpcSummary; confidence: number } | null = null;

  if (args.uprn) {
    best = selectBestMatch(await searchByUprn(args.uprn), args.address, { fromUprn: true });
  }
  if (!best) {
    best = selectBestMatch(await searchByPostcode(args.postcode), args.address);
  }
  if (!best) return null;

  const cert = best.row.certificateNumber ? await fetchCertificate(best.row.certificateNumber) : null;
  return buildMatch(best.row, cert, best.confidence);
}
