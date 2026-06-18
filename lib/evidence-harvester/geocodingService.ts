/**
 * geocodingService — resolve a selected property's EXACT address to address-level coordinates via the
 * Google Geocoding API, so Street View / static map / exterior-vision frame the right building
 * (Postcodes.io only gives the postcode centroid).
 *
 * Results are cached in the shared `address_geocodes` table (keyed by UPRN when known, else a
 * normalised address|postcode key) so we don't re-bill Google for the same address across users.
 * Reuses GOOGLE_MAPS_SERVER_API_KEY (same key Street View uses) and the shared fetchWithRetry helper.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { fetchWithRetry } from './http';
import { normalisePostcode } from './postcodesService';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export type GeocodeResult = {
  lat: number;
  lon: number;
  precision: string;          // Google location_type, or 'CACHED' when served from our cache
  formattedAddress: string;
  source: 'google';
};

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

/** Google location_type values precise enough to prefer over the postcode centroid. */
export function isPreciseGeocode(precision: string | null | undefined): boolean {
  return precision === 'ROOFTOP' || precision === 'RANGE_INTERPOLATED' || precision === 'CACHED';
}

function addressKey(uprn: string | null | undefined, address: string, postcode: string): string {
  if (uprn) return `uprn:${uprn}`;
  const norm = `${address} ${postcode}`.toLowerCase().replace(/\s+/g, ' ').trim();
  return `addr:${norm}`;
}

/**
 * Geocode the exact address. Checks the shared cache first; on miss calls Google, then upserts the
 * cache (best-effort). Returns null when geocoding is unavailable or yields no result — the caller
 * should fall back to the postcode centroid.
 */
export async function geocodeAddress(
  db: SupabaseClient<Database>,
  input: { uprn?: string | null; address: string; postcode: string },
): Promise<GeocodeResult | null> {
  const address = input.address?.trim();
  if (!address) return null;
  const key = addressKey(input.uprn, address, input.postcode);

  // 1. Cache.
  const { data: cached } = await db
    .from('address_geocodes')
    .select('latitude, longitude, precision, formatted_address')
    .eq('address_key', key)
    .maybeSingle();
  if (cached && cached.latitude != null && cached.longitude != null) {
    return {
      lat: cached.latitude,
      lon: cached.longitude,
      precision: cached.precision ?? 'CACHED',
      formattedAddress: cached.formatted_address ?? address,
      source: 'google',
    };
  }

  // 2. Google Geocoding (constrained to GB + the postcode to avoid wrong-region matches).
  const gkey = apiKey();
  if (!gkey) return null;
  const params = new URLSearchParams({
    address,
    key: gkey,
    region: 'uk',
    components: `country:GB|postal_code:${normalisePostcode(input.postcode)}`,
  });
  let res: Response;
  try {
    res = await fetchWithRetry(`${GEOCODE_URL}?${params.toString()}`, {}, { timeoutMs: 10000, retries: 2 });
  } catch {
    return null;
  }
  if (!res.ok) {
    console.warn(`[geocode] Google HTTP ${res.status} for "${address}" — using postcode centroid`);
    return null;
  }
  const body = (await res.json().catch(() => null)) as {
    status?: string;
    error_message?: string;
    results?: { geometry?: { location?: { lat: number; lng: number }; location_type?: string }; formatted_address?: string }[];
  } | null;
  // ZERO_RESULTS is a normal "no match for this address". Any other non-OK status (REQUEST_DENIED,
  // OVER_QUERY_LIMIT, INVALID_REQUEST) is a config/quota problem — surface it, because the caller
  // otherwise silently falls back to the postcode centroid (so imagery frames the wrong spot).
  if (body?.status !== 'OK') {
    if (body?.status && body.status !== 'ZERO_RESULTS') {
      console.warn(
        `[geocode] Google status=${body.status} for "${address}"${body.error_message ? ` — ${body.error_message}` : ''}. ` +
          `Enable the Geocoding API for this key; using postcode centroid for now.`,
      );
    }
    return null;
  }
  const top = body.results?.[0];
  const loc = top?.geometry?.location;
  if (!loc) return null;

  const result: GeocodeResult = {
    lat: loc.lat,
    lon: loc.lng,
    precision: top?.geometry?.location_type ?? 'APPROXIMATE',
    formattedAddress: top?.formatted_address ?? address,
    source: 'google',
  };

  // 3. Cache (best-effort; never block enrichment on a cache write).
  try {
    await db.from('address_geocodes').upsert(
      {
        address_key: key,
        formatted_address: result.formattedAddress,
        latitude: result.lat,
        longitude: result.lon,
        precision: result.precision,
        source: 'google',
      },
      { onConflict: 'address_key' },
    );
  } catch {
    /* ignore cache write failures */
  }

  return result;
}
