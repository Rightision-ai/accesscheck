import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(); if (isApiError(context)) return context; if (!context.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
  const { id } = await params; const body = (await request.json()) as Record<string, unknown>; // member_limit is deliberately platform-admin-only: it is the seat entitlement,
// so an organisation admin must not be able to raise their own cap.
const allowed = ["account_type", "status", "contract_name", "contract_start_date", "contract_end_date", "support_email", "member_limit"]; const update = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, typeof body[key] === "string" ? String(body[key]).trim() || null : body[key]]));
  const db = asLooseClient(await createClient()); const result = await db.from("organisations").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 }); return NextResponse.json({ organisation: result.data });
}
