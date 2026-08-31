/**
 * Canonical references to Supabase Storage objects.
 *
 * `evidences` and `floor-plan-detections` are private buckets: the browser only
 * ever sees a short-lived signed URL, and a signed URL must NEVER be persisted
 * because it expires and the row rots. So the database stores a bucket-relative
 * reference instead — `storage://<bucket>/<path>` — and the read path signs it.
 *
 * Legacy rows still hold full public URLs from when these buckets were public,
 * so every parser here accepts all three shapes. Rows migrate themselves to the
 * canonical form as they are re-saved; there is deliberately no backfill.
 *
 * Isomorphic: imported by browser code, server code and the purge script.
 */

export const STORAGE_REF_SCHEME = "storage://";

/** Buckets holding survey media. Private; read only via signed URLs. */
export const MEDIA_BUCKETS = ["evidences", "floor-plan-detections"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

/** Every bucket a stored reference may point at. */
const KNOWN_BUCKETS = [...MEDIA_BUCKETS, "branding", "marketing-assets"] as const;

export type StorageRef = { bucket: string; path: string };

/** Build the canonical reference stored in the database. */
export function toStorageRef(bucket: string, path: string): string {
  return `${STORAGE_REF_SCHEME}${bucket}/${path}`;
}

/**
 * Turn a stored URL into a `bucket`-relative object path.
 *
 * Returns null for anything that is not an object in the expected bucket of this project —
 * the harvester stores third-party URLs in adjacent columns, and a stray `data:` URL from an
 * old wizard build would otherwise be handed to `storage.remove()` as a literal path.
 */
export function toStoragePath(rawUrl: string, bucket: string): string | null {
  if (!rawUrl.startsWith("http")) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  // Both shapes appear in the wild: public URLs, and signed URLs from a private bucket.
  const marker = `/storage/v1/object/public/${bucket}/`;
  const signed = `/storage/v1/object/sign/${bucket}/`;
  const path = parsed.pathname.startsWith(marker)
    ? parsed.pathname.slice(marker.length)
    : parsed.pathname.startsWith(signed)
      ? parsed.pathname.slice(signed.length)
      : null;
  if (!path) return null;
  // The path is percent-encoded inside a URL; storage expects it decoded.
  return decodeURIComponent(path);
}

/**
 * Recognise any of the three shapes a stored media reference can take:
 * a `storage://` ref, a legacy public URL, or a signed URL.
 *
 * Returns null for `data:` URLs, third-party URLs (council planning portals) and
 * anything else — callers use that to leave unrelated strings untouched.
 */
export function parseStorageRef(value: unknown): StorageRef | null {
  if (typeof value !== "string" || value.length === 0) return null;

  if (value.startsWith(STORAGE_REF_SCHEME)) {
    const rest = value.slice(STORAGE_REF_SCHEME.length);
    const slash = rest.indexOf("/");
    if (slash <= 0 || slash === rest.length - 1) return null;
    return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
  }

  for (const bucket of KNOWN_BUCKETS) {
    const path = toStoragePath(value, bucket);
    if (path) return { bucket, path };
  }
  return null;
}

/** True when the reference points at a private survey-media bucket. */
export function isMediaRef(ref: StorageRef): boolean {
  return (MEDIA_BUCKETS as readonly string[]).includes(ref.bucket);
}

/**
 * Walk an arbitrary object tree, replacing every recognised storage reference
 * using `map`. Mirrors the traversal in `uploadImagesAndReplaceUrls`
 * (lib/surveys/upload.ts), which does the same walk for base64 images.
 *
 * Returning `undefined` from `map` leaves the original string in place.
 */
export function mapStorageRefsDeep<T>(
  value: T,
  map: (ref: StorageRef, original: string) => string | undefined,
): T {
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      const ref = parseStorageRef(node);
      if (!ref) return node;
      return map(ref, node) ?? node;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object" && !(node instanceof Blob) && !(node instanceof Date)) {
      return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, walk(item)]));
    }
    return node;
  };
  return walk(value) as T;
}

/** Collect every distinct storage reference in a tree, in encounter order. */
export function collectStorageRefs(value: unknown): string[] {
  const seen = new Set<string>();
  mapStorageRefsDeep(value, (_ref, original) => {
    seen.add(original);
    return undefined;
  });
  return [...seen];
}

/**
 * Rewrite every full URL in a tree back to a canonical `storage://` reference.
 *
 * The safety net on the write path: a signed URL that leaked into client state
 * can never reach the database, and legacy public URLs are quietly upgraded on
 * every re-save. Idempotent.
 */
export function normaliseStorageRefsDeep<T>(value: T): T {
  return mapStorageRefsDeep(value, (ref) => toStorageRef(ref.bucket, ref.path));
}
