import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";

export async function GET() {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const supabase = await createClient(); const { data: auth } = await supabase.auth.getUser(); const db = asLooseClient(supabase);
  const result = await db.from("organisation_members").select("display_name,email,job_title,phone,avatar_url").eq("id", context.memberId).single();
  return NextResponse.json({ profile: result.data, email: auth.user?.email });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const body = (await request.json()) as { displayName?: string; jobTitle?: string; phone?: string; avatarUrl?: string };
  const db = asLooseClient(await createClient());
  const result = await db.from("organisation_members").update({ display_name: body.displayName?.trim() || null, job_title: body.jobTitle?.trim() || null, phone: body.phone?.trim() || null, avatar_url: body.avatarUrl?.trim() || null, updated_at: new Date().toISOString() }).eq("id", context.memberId).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ profile: result.data });
}
