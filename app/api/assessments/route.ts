import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { ASSESSMENT_STATUSES } from "@/lib/assessments/status";
import type { AssessmentStatus } from "@/types/accesscheck";
import { applySurveyVisibility } from "@/lib/surveys/visibility";

export async function GET(request: NextRequest) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") as AssessmentStatus | null;
  const sort = request.nextUrl.searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(request.nextUrl.searchParams.get("pageSize") ?? 25)));
  const fromDate = request.nextUrl.searchParams.get("from");
  const toDate = request.nextUrl.searchParams.get("to");

  const db = asLooseClient(await createClient());
  let query = applySurveyVisibility(
    db
      .from("surveys")
      .select("id,created_at,updated_at,status,door_number,street_number,building_name,street,postcode,inspector_name,inspection_date,overall_grade,assessment_completion_percent,assessment_readiness,completed_at", { count: "exact" })
      .eq("organisation_id", context.organisationId),
    context,
  );
  if (status && ASSESSMENT_STATUSES.includes(status)) query = query.eq("status", status);
  if (search) {
    const safe = search.replace(/[(),]/g, " ");
    query = query.or(`street.ilike.%${safe}%,postcode.ilike.%${safe}%,inspector_name.ilike.%${safe}%,uprn.ilike.%${safe}%`);
  }
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
  query = query
    .order("updated_at", { ascending: sort === "oldest" })
    .range((page - 1) * pageSize, page * pageSize - 1);
  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ assessments: result.data ?? [], total: result.count ?? 0, page, pageSize });
}
