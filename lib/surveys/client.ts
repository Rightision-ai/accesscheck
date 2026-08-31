import { uploadImagesAndReplaceUrls } from "./upload";
import { normaliseStorageRefsDeep } from "@/lib/storage/refs";

/**
 * The caller's organisation id, fetched once per page load.
 *
 * Uploads go straight from the browser to Storage and the `evidence_org_write`
 * policy requires the object path to start with this id, so it is needed before
 * any image can be written. Memoised because every save needs it.
 */
let organisationIdPromise: Promise<string | null> | null = null;

export function resetOrganisationIdCache(): void {
  organisationIdPromise = null;
}

export async function getOrganisationId(): Promise<string | null> {
  organisationIdPromise ??= fetch("/api/organisations/me")
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => body?.organisationId ?? null)
    .catch(() => null);
  const id = await organisationIdPromise;
  // Don't cache a failure — a transient error would break uploads for the
  // rest of the session.
  if (!id) organisationIdPromise = null;
  return id;
}

/**
 * Client-side survey save. Uploads images to Supabase Storage first,
 * then sends only storage references in the payload (no base64 in body).
 */
export async function saveSurveyClient(caseData: any): Promise<{
  success?: boolean;
  id?: string;
  error?: string;
}> {
  const organisationId = await getOrganisationId();
  if (!organisationId) {
    return { error: "Could not determine your organisation. Reload and try again." };
  }

  let payload = caseData;
  try {
    payload = await uploadImagesAndReplaceUrls(
      { ...caseData },
      `${organisationId}/${caseData.id || "new"}`
    );
  } catch (uploadErr) {
    console.error("Image upload failed:", uploadErr);
    return {
      error:
        uploadErr instanceof Error ? uploadErr.message : "Failed to upload images",
    };
  }

  // Safety net: a signed URL expires, so one must never reach the database.
  // This rewrites any full URL — signed, or a legacy public one on an older
  // survey — back to a canonical `storage://` reference. Idempotent, and it is
  // what quietly migrates old rows off dead public URLs as they are re-saved.
  payload = normaliseStorageRefsDeep(payload);

  const res = await fetch("/api/surveys/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    return { error: data.error || "Failed to save" };
  }

  return { success: true, id: data.id ? String(data.id) : undefined };
}
