/**
 * Browser-side survey media upload.
 *
 * `evidences` and `floor-plan-detections` are private, so an upload returns a
 * `storage://` reference that no `<img>` can render. These helpers upload and
 * then immediately sign, so the caller gets a URL it can display right away.
 *
 * The wizard therefore holds SIGNED URLs in its form state, which is safe
 * because `saveSurveyClient` runs `normaliseStorageRefsDeep` before persisting
 * — an expiring URL can never reach the database.
 */
import { uploadBase64ToStorage, uploadFileToStorage } from "@/lib/surveys/upload";
import { getOrganisationId } from "@/lib/surveys/client";
import type { MediaBucket } from "./refs";

/** Sign references in one round trip. Unsignable ones are simply absent. */
export async function signRefs(refs: string[]): Promise<Record<string, string>> {
  if (refs.length === 0) return {};
  try {
    const response = await fetch("/api/storage/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refs }),
    });
    if (!response.ok) return {};
    const body = (await response.json()) as { urls?: Record<string, string> };
    return body.urls ?? {};
  } catch {
    return {};
  }
}

async function signOne(ref: string): Promise<string> {
  // Fall back to the reference itself: it will not render, but it still saves
  // correctly, so a signing hiccup costs a preview rather than the photo.
  return (await signRefs([ref]))[ref] ?? ref;
}

/**
 * Build an object path inside the caller's organisation folder — the prefix the
 * `evidence_org_write` policy requires. Returns null when the organisation is
 * unknown, in which case the upload would be rejected anyway.
 */
export async function mediaPath(surveyId: string | number | null | undefined, name: string): Promise<string | null> {
  const organisationId = await getOrganisationId();
  if (!organisationId) return null;
  return `${organisationId}/${surveyId || "new"}/${name}`;
}

/** Upload a base64 image and return a signed URL fit for immediate display. */
export async function uploadMediaBase64(
  dataUrl: string,
  surveyId: string | number | null | undefined,
  name: string,
  bucket: MediaBucket = "evidences",
): Promise<string> {
  const path = await mediaPath(surveyId, name);
  if (!path) throw new Error("Could not determine your organisation. Reload and try again.");
  return signOne(await uploadBase64ToStorage(dataUrl, path, bucket));
}

/** Upload a File/Blob (e.g. a PDF floor plan) and return a signed URL. */
export async function uploadMediaFile(
  file: File | Blob,
  surveyId: string | number | null | undefined,
  name: string,
  bucket: MediaBucket = "evidences",
): Promise<string> {
  const path = await mediaPath(surveyId, name);
  if (!path) throw new Error("Could not determine your organisation. Reload and try again.");
  return signOne(await uploadFileToStorage(file, path, bucket));
}
