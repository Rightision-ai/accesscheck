import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";

export async function GET() {
  const context = await requireApiContext(); if (isApiError(context)) return context;
  const db = asLooseClient(await createClient()); const result = await db.from("organisations").select("name,account_type,status,contract_name,contract_start_date,contract_end_date,support_email").eq("id", context.organisationId).single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 }); return NextResponse.json({ account: result.data });
}
