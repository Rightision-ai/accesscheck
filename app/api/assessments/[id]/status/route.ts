import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { canTransitionAssessment, validateAssessment } from "@/lib/assessments/workflow";
import { ASSESSMENT_STATUSES, normalizeAssessmentStatus } from "@/lib/assessments/status";
import type { AssessmentStatus } from "@/types/accesscheck";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  const { id } = await params;
  const body = (await request.json()) as { status?: AssessmentStatus; reason?: string };
  if (!body.status) return NextResponse.json({ error: "Target status is required." }, { status: 400 });
  if (!ASSESSMENT_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Unknown assessment status: ${body.status}` }, { status: 400 });
  }
  const surveyId = Number(id);
  if (!Number.isInteger(surveyId)) return NextResponse.json({ error: "Invalid assessment ID." }, { status: 400 });
  const db = asLooseClient(await createClient());
  const [surveyResult, evidenceResult] = await Promise.all([
    db.from("surveys").select("*").eq("id", surveyId).eq("organisation_id", context.organisationId).single(),
    db.from("survey_evidences").select("id", { count: "exact", head: true }).eq("survey_id", surveyId),
  ]);
  if (surveyResult.error || !surveyResult.data) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  const survey = surveyResult.data as Record<string, unknown>;
  const validation = validateAssessment({
    street: survey.street as string | null,
    postcode: survey.postcode as string | null,
    propertyType: survey.property_type as string | null,
    inspectorName: survey.inspector_name as string | null,
    inspectionDate: survey.inspection_date as string | null,
    overallGrade: survey.overall_grade as string | null,
    evidenceCount: evidenceResult.count ?? 0,
  });
  const currentStatus = normalizeAssessmentStatus(survey.status);
  // canTransitionAssessment takes a raw permission list, so platform admins have to be
  // expanded here the way hasPermission() does it.
  const permissions = context.isPlatformAdmin ? ["author", "admin"] : context.permissions;
  if (!canTransitionAssessment(currentStatus, body.status, permissions, validation.completionPercent, body.reason)) {
    return NextResponse.json(
      { error: "This status transition is not allowed.", validation },
      { status: 400 },
    );
  }
  const result = await db
    .from("surveys")
    .update({
      status: body.status,
      transition_reason: body.reason?.trim() || null,
      assessment_completion_percent: validation.completionPercent,
      assessment_readiness: validation.readiness,
    })
    .eq("id", surveyId)
    .select("id,status,completed_at")
    .single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ assessment: result.data, validation });
}
