/**
 * PostcodesService — postcode validation + geography via the free Postcodes.io API.
 * Docs: https://postcodes.io/docs
 */
import { fetchWithRetry } from './http';
import type { PostcodeResult } from './types';

const BASE_URL = process.env.POSTCODES_IO_BASE_URL || 'https://api.postcodes.io';
const BULK_CHUNK = 100; // Postcodes.io accepts up to 100 postcodes per bulk request.

type RawPostcode = {
  postcode: string;
  longitude: number | null;
  latitude: number | null;
  admin_district: string | null;
  admin_district_code?: string | null;
  codes?: { admin_district?: string | null };
  region: string | null;
  admin_ward: string | null;
};

/** Uppercase, trim, single space before the inward code. */
export function normalisePostcode(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw.toUpperCase().replace(/\s+/g, '');
  if (cleaned.length < 5) return cleaned;
  return `${cleaned.slice(0, cleaned.length - 3)} ${cleaned.slice(cleaned.length - 3)}`;
}

function toResult(raw: RawPostcode): PostcodeResult {
  return {
    postcode: raw.postcode,
    postcode_normalised: normalisePostcode(raw.postcode),
    latitude: raw.latitude,
    longitude: raw.longitude,
    local_authority: raw.admin_district,
    local_authority_code: raw.codes?.admin_district ?? raw.admin_district_code ?? null,
    region: raw.region,
    ward: raw.admin_ward,
  };
}

/** Validate + look up a single postcode. Returns null for invalid/terminated/not-found. */
export async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  const normalised = normalisePostcode(postcode);
  if (!normalised) return null;
  const url = `${BASE_URL}/postcodes/${encodeURIComponent(normalised)}`;
  const res = await fetchWithRetry(url);
  if (res.status === 404) return null; // invalid / terminated
  if (!res.ok) throw new Error(`Postcodes.io ${res.status} for ${normalised}`);
  const body = (await res.json().catch(() => null)) as { result?: RawPostcode | null } | null;
  if (!body?.result) return null;
  return toResult(body.result);
}

/**
 * Bulk lookup with automatic chunking (≤100/request). Returns a map keyed by the NORMALISED
 * postcode. Postcodes that don't resolve are simply absent from the map.
 */
export async function bulkLookupPostcodes(
  postcodes: string[],
): Promise<Map<string, PostcodeResult>> {
  const out = new Map<string, PostcodeResult>();
  const unique = Array.from(new Set(postcodes.map(normalisePostcode).filter(Boolean)));

  for (let i = 0; i < unique.length; i += BULK_CHUNK) {
    const chunk = unique.slice(i, i + BULK_CHUNK);
    const res = await fetchWithRetry(`${BASE_URL}/postcodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: chunk }),
    });
    if (!res.ok) continue; // a failed chunk leaves those postcodes unresolved, not the whole job
    const body = (await res.json().catch(() => null)) as {
      result?: { query: string; result: RawPostcode | null }[];
    } | null;
    for (const entry of body?.result ?? []) {
      if (entry.result) {
        const r = toResult(entry.result);
        out.set(r.postcode_normalised, r);
      }
    }
  }
  return out;
}
