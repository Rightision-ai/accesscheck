/**
 * Signing and reading private storage objects with the service role.
 *
 * SERVER ONLY. Deliberately not marked with the `server-only` package: this
 * module is also imported by `scripts/backfill-adaptation-plans.ts` through the
 * engine client, and that package throws under plain node. The guard is the
 * same one `lib/supabase/service.ts` relies on — the service-role key has no
 * NEXT_PUBLIC_ prefix, so a client bundle could never obtain one anyway.
 * NEVER import this from a Client Component.
 */
import { createServiceClient } from "@/lib/supabase/service";
import {
  collectStorageRefs,
  mapStorageRefsDeep,
  parseStorageRef,
  type StorageRef,
} from "./refs";

/**
 * How long a signed survey-media URL stays valid.
 *
 * This has to comfortably outlast the time a report page sits open before
 * someone clicks "Download AHR PDF": `waitForImages` in ReportView swallows a
 * failed image after a 3s timeout, so an expired URL produces a silently blank
 * region in the PDF rather than an error. 12h covers a working day.
 */
export const SIGNED_URL_TTL_SECONDS = 43_200;

/**
 * Sign with the service role.
 *
 * The private media buckets deliberately have no SELECT policy — reads are not
 * granted to `authenticated` at all. Callers MUST have already authorised the
 * user against the owning row (every call site loads the survey through the
 * RLS-scoped client first), so a user who cannot read the survey never gets
 * here and therefore never obtains a signature.
 */
async function signPaths(bucket: string, paths: string[]): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const storage = createServiceClient().storage.from(bucket);
  // Batch: a report carries 20+ photos, and one round trip per photo is slow.
  const { data, error } = await storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error(`[storage] could not sign ${paths.length} object(s) in ${bucket}:`, error.message);
    return signed;
  }
  for (const entry of data ?? []) {
    // `path` echoes the request; a missing object comes back with an error and no URL.
    if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  return signed;
}

/**
 * Replace every storage reference in a tree with a signed URL.
 *
 * Walks the whole object rather than named fields because survey media is
 * scattered through `raw_ai_data` — `wizardData.categoryPhotos.*`,
 * `wizardData.floorPlan`, `floorPlanDetection.annotated_image_url` and
 * anywhere else the wizard happened to put a URL.
 *
 * A reference that cannot be signed (deleted object, bad path) becomes an empty
 * string, so the UI renders nothing rather than a broken image.
 */
export async function signStorageRefsDeep<T>(value: T): Promise<T> {
  const refs = collectStorageRefs(value);
  if (refs.length === 0) return value;

  const byBucket = new Map<string, Set<string>>();
  for (const original of refs) {
    const ref = parseStorageRef(original) as StorageRef;
    const paths = byBucket.get(ref.bucket) ?? new Set<string>();
    paths.add(ref.path);
    byBucket.set(ref.bucket, paths);
  }

  const results = await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => [bucket, await signPaths(bucket, [...paths])] as const),
  );
  const signedByBucket = new Map(results);

  return mapStorageRefsDeep(value, (ref) => signedByBucket.get(ref.bucket)?.get(ref.path) ?? "");
}

/** Sign a single reference, or null if it is unrecognised or unavailable. */
export async function signStorageRef(value: unknown): Promise<string | null> {
  const ref = parseStorageRef(value);
  if (!ref) return null;
  const signed = await signPaths(ref.bucket, [ref.path]);
  return signed.get(ref.path) ?? null;
}

/**
 * Download an object's bytes with the service role.
 *
 * For server consumers that need the image itself rather than a URL — the
 * adaptation-plan engine inlines evidence photos as base64 for Gemini, and
 * fetching a signed URL over the network just to read our own bucket would be
 * a pointless round trip that also fails silently when the URL expires.
 */
export async function downloadStorageRef(
  value: unknown,
): Promise<{ bytes: Buffer; mime: string } | null> {
  const ref = parseStorageRef(value);
  if (!ref) return null;
  const { data, error } = await createServiceClient().storage.from(ref.bucket).download(ref.path);
  if (error || !data) {
    console.warn(`[storage] could not download ${ref.bucket}/${ref.path}: ${error?.message}`);
    return null;
  }
  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    mime: data.type || "application/octet-stream",
  };
}
