import { NextRequest, NextResponse } from "next/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { MEDIA_BUCKETS, parseStorageRef } from "@/lib/storage/refs";
import { signStorageRefsDeep } from "@/lib/storage/signing";

const MAX_REFS = 100;

/**
 * Sign survey-media references so the wizard can display an image it has just
 * uploaded. Everything else is signed server-side while rendering a page.
 *
 * Authorisation is by path: a reference is only signed when it lives in a media
 * bucket AND its first path segment is the caller's own organisation id — the
 * same rule the `evidence_org_write` storage policy enforces on write. That
 * makes this endpoint useless for reaching another organisation's objects.
 *
 * Legacy objects predate the organisation prefix and are deliberately NOT
 * signable here; they are only ever signed by a page that has already loaded
 * the owning survey through RLS.
 */
export async function POST(request: NextRequest) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;

  const body = (await request.json().catch(() => null)) as { refs?: unknown } | null;
  const refs = Array.isArray(body?.refs) ? body.refs.filter((ref) => typeof ref === "string") : [];
  if (refs.length === 0) return NextResponse.json({ urls: {} });
  if (refs.length > MAX_REFS) {
    return NextResponse.json({ error: `At most ${MAX_REFS} references per request.` }, { status: 400 });
  }

  const allowed = (refs as string[]).filter((value) => {
    const ref = parseStorageRef(value);
    if (!ref || !(MEDIA_BUCKETS as readonly string[]).includes(ref.bucket)) return false;
    return ref.path.split("/")[0] === context.organisationId;
  });

  const signed = await signStorageRefsDeep(allowed);
  const urls: Record<string, string> = {};
  allowed.forEach((ref, index) => {
    if (signed[index]) urls[ref] = signed[index];
  });
  return NextResponse.json({ urls });
}
