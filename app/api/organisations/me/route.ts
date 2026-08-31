import { NextResponse } from "next/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";

/**
 * The caller's own organisation id.
 *
 * Survey media uploads go straight from the browser to Storage, and the
 * `evidence_org_write` policy requires the object path to start with the
 * caller's organisation id — so the browser has to know it. Unlike
 * `/api/organisations/current` this is readable by any active member, not just
 * admins, and returns nothing else.
 */
export async function GET() {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  return NextResponse.json({ organisationId: context.organisationId });
}
