/**
 * StreetViewService — exterior imagery evidence via Google Street View.
 *
 * Cost discipline (spec §12): always check the FREE metadata endpoint first; only fetch (paid)
 * images when BOTH GOOGLE_STREET_VIEW_ENABLED and GOOGLE_STREET_VIEW_FETCH_IMAGES are 'true'.
 * Raw imagery is never persisted — only metadata (pano id, date) and extracted observations are stored.
 */
import { fetchWithRetry } from './http';
import type { StreetViewMeta } from './types';

const META_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';
const IMG_URL = 'https://maps.googleapis.com/maps/api/streetview';
const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';

export type FetchedImage = { mime: string; buffer: Buffer };

/** Whether we have any Google Maps key (server or public) to call the static APIs. */
export function hasMapsKey(): boolean {
  return Boolean(apiKey());
}

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

export function isStreetViewEnabled(): boolean {
  return process.env.GOOGLE_STREET_VIEW_ENABLED === 'true' && Boolean(apiKey());
}

export function isImageFetchEnabled(): boolean {
  return isStreetViewEnabled() && process.env.GOOGLE_STREET_VIEW_FETCH_IMAGES === 'true';
}

/** Free metadata check: does Street View imagery exist near these coordinates? */
export async function checkMetadata(lat: number, lon: number): Promise<StreetViewMeta> {
  const empty: StreetViewMeta = { available: false, pano_id: null, image_date: null, latitude: lat, longitude: lon };
  const key = apiKey();
  if (!isStreetViewEnabled() || !key) return empty;

  const url = `${META_URL}?location=${lat},${lon}&key=${key}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return empty;
  const body = (await res.json().catch(() => null)) as {
    status?: string;
    pano_id?: string;
    date?: string;
    location?: { lat: number; lng: number };
  } | null;
  if (body?.status !== 'OK') return empty;
  return {
    available: true,
    pano_id: body.pano_id ?? null,
    image_date: body.date ?? null,
    latitude: body.location?.lat ?? lat,
    longitude: body.location?.lng ?? lon,
  };
}

/**
 * Fetch images for several headings around a point, returned as base64 for AI analysis (never stored).
 * No-op unless image fetching is explicitly enabled.
 */
export async function getImagesForHeadings(
  lat: number,
  lon: number,
  headings: number[] = [0, 90, 180, 270],
): Promise<{ heading: number; mime: string; base64: string }[]> {
  const key = apiKey();
  if (!isImageFetchEnabled() || !key) return [];

  const out: { heading: number; mime: string; base64: string }[] = [];
  for (const heading of headings) {
    const url = `${IMG_URL}?size=640x640&location=${lat},${lon}&heading=${heading}&pitch=0&fov=80&key=${key}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) continue;
    const mime = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 4 * 1024 * 1024) continue;
    out.push({ heading, mime, base64: buf.toString('base64') });
  }
  return out;
}

/**
 * Fetch a single Street View screenshot to persist (640x640, facing the property). Gated by the
 * same flags as image analysis. Returns null when disabled, no key, or no imagery.
 */
export async function getStreetViewScreenshot(lat: number, lon: number): Promise<FetchedImage | null> {
  const key = apiKey();
  if (!isImageFetchEnabled() || !key) return null;
  const url = `${IMG_URL}?size=640x640&location=${lat},${lon}&fov=80&pitch=0&key=${key}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const mime = res.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 2048) return null; // Google returns a small "no imagery" placeholder
  return { mime, buffer };
}

/** Fetch a static map with a marker at the property. Only needs a Maps key (no Street View flags). */
export async function getStaticMap(lat: number, lon: number): Promise<FetchedImage | null> {
  const key = apiKey();
  if (!key) return null;
  const url =
    `${STATIC_MAP_URL}?center=${lat},${lon}&zoom=18&size=640x400&scale=2&maptype=roadmap` +
    `&markers=color:red%7C${lat},${lon}&key=${key}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const mime = res.headers.get('content-type') || 'image/png';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 1024) return null;
  return { mime, buffer };
}
