import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { PHONE_ERROR, isValidPhone } from "@/lib/utils/phone";

export async function GET() {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const supabase = await createClient(); const { data: auth } = await supabase.auth.getUser(); const db = asLooseClient(supabase);
  const result = await db.from("organisation_members").select("first_name,last_name,email,job_title,phone,avatar_url").eq("id", context.memberId).single();
  return NextResponse.json({ profile: result.data, email: auth.user?.email });
}

export async function PATCH(request: NextRequest) {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const body = (await request.json()) as { firstName?: string; lastName?: string; jobTitle?: string; phone?: string; avatarUrl?: string };
  const firstName = body.firstName?.trim() || null; const lastName = body.lastName?.trim() || null; const phone = body.phone?.trim() || null;
  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  const supabase = await createClient(); const db = asLooseClient(supabase);
  const result = await db.from("organisation_members").update({ first_name: firstName, last_name: lastName, job_title: body.jobTitle?.trim() || null, phone, avatar_url: body.avatarUrl?.trim() || null, updated_at: new Date().toISOString() }).eq("id", context.memberId).select("*").single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  // Mirror the name into auth metadata so the app-shell header stops falling back to the email.
  await supabase.auth.updateUser({ data: { full_name: `${firstName} ${lastName}` } });
  return NextResponse.json({ profile: result.data });
}
