import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { EMAIL_ERROR, PHONE_ERROR, isValidEmail, isValidPhone } from "@/lib/utils/phone";

export async function GET() {
  const context = await requireApiContext("admin"); if (isApiError(context)) return context;
  const db = asLooseClient(await createClient()); const result = await db.from("organisations").select("*").eq("id", context.organisationId).single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 }); return NextResponse.json({ organisation: result.data });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiContext("admin"); if (isApiError(context)) return context;
  const body = (await request.json()) as Record<string, unknown>;
  // Timezone and locale keep their column defaults; they are no longer editable.
  const allowed = ["name", "contact_name", "contact_email", "contact_phone", "address_line_1", "address_line_2", "city", "region", "postcode", "logo_url"];
  const update = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, typeof body[key] === "string" ? String(body[key]).trim() || null : body[key]]));
  if ("name" in update && !update.name) return NextResponse.json({ error: "Organisation name is required." }, { status: 400 });
  if (!isValidEmail(update.contact_email as string | null)) return NextResponse.json({ error: EMAIL_ERROR }, { status: 400 });
  if (!isValidPhone(update.contact_phone as string | null)) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  update.updated_at = new Date().toISOString();
  const db = asLooseClient(await createClient()); const result = await db.from("organisations").update(update).eq("id", context.organisationId).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  await db.from("organisation_audit_events").insert({ organisation_id: context.organisationId, actor_user_id: context.userId, action: "organisation.updated", entity_type: "organisation", entity_id: context.organisationId, metadata: { fields: Object.keys(update).filter((key) => key !== "updated_at") } });
  return NextResponse.json({ organisation: result.data });
}
