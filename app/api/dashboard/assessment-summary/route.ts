import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { buildAssessmentSummary, buildWeeklyTrend, type AssessmentAnalyticsRow } from "@/lib/assessments/analytics";

export async function GET() {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  const db = asLooseClient(await createClient());
  const [assessmentsResult, recentResult, activityResult] = await Promise.all([
    db.from("surveys").select("id,created_at,updated_at,completed_at,status,assessment_readiness,overall_grade").eq("organisation_id", context.organisationId),
    db.from("surveys").select("id,updated_at,status,street,postcode,inspector_name,assessment_completion_percent,assessment_readiness").eq("organisation_id", context.organisationId).order("updated_at", { ascending: false }).limit(8),
    db.from("organisation_audit_events").select("id,action,entity_type,metadata,created_at").eq("organisation_id", context.organisationId).order("created_at", { ascending: false }).limit(8),
  ]);
  if (assessmentsResult.error) return NextResponse.json({ error: assessmentsResult.error.message }, { status: 500 });
  const rows = (assessmentsResult.data ?? []) as AssessmentAnalyticsRow[];
  return NextResponse.json({
    organisation: { id: context.organisationId, name: context.organisationName },
    summary: buildAssessmentSummary(rows),
    weeklyTrend: buildWeeklyTrend(rows),
    recentAssessments: recentResult.data ?? [],
    recentActivity: activityResult.data ?? [],
  });
}
