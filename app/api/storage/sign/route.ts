import { NextRequest, NextResponse } from "next/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
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

  // Paths are `<organisation id>/<survey id>/…`. The organisation segment is the
  // first gate; the survey segment is the second, because an author may no
  // longer open a colleague's case and must not be able to sign its photos
  // either. `new` is the wizard's placeholder before a case has an id — those
  // objects belong to whoever is mid-draft, so the organisation check is all
  // that can be applied to them.
  const candidates = (refs as string[]).flatMap((value) => {
    const ref = parseStorageRef(value);
    if (!ref || !(MEDIA_BUCKETS as readonly string[]).includes(ref.bucket)) return [];
    const [organisationSegment, surveySegment] = ref.path.split("/");
    if (organisationSegment !== context.organisationId) return [];
    const surveyId = Number(surveySegment);
    return [{ value, surveyId: Number.isInteger(surveyId) && surveyId > 0 ? surveyId : null }];
  });

  // One round trip: ask the RLS-scoped client which of those surveys it can see.
  const surveyIds = [...new Set(candidates.map((c) => c.surveyId).filter((id): id is number => id !== null))];
  const visible = new Set<number>();
  if (surveyIds.length > 0) {
    const db = asLooseClient(await createClient());
    const result = await db.from("surveys").select("id").in("id", surveyIds);
    for (const row of (result.data ?? []) as Array<{ id: number }>) visible.add(row.id);
  }

  const allowed = candidates
    .filter((c) => c.surveyId === null || visible.has(c.surveyId))
    .map((c) => c.value);

  const signed = await signStorageRefsDeep(allowed);
  const urls: Record<string, string> = {};
  allowed.forEach((ref, index) => {
    if (signed[index]) urls[ref] = signed[index];
  });
  return NextResponse.json({ urls });
}
