import "server-only";

import type { LooseClient } from "@/lib/supabase/loose";
import { validateAssessment } from "@/lib/assessments/workflow";

export async function refreshAssessmentReadiness(db: LooseClient, surveyId: number) {
  const [surveyResult, evidenceResult] = await Promise.all([
    db.from("surveys").select("street,postcode,property_type,inspector_name,inspection_date,overall_grade").eq("id", surveyId).single(),
    db.from("survey_evidences").select("id", { count: "exact", head: true }).eq("survey_id", surveyId),
  ]);
  if (surveyResult.error || !surveyResult.data) return null;
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
  await db.from("surveys").update({ assessment_completion_percent: validation.completionPercent, assessment_readiness: validation.readiness }).eq("id", surveyId);
  return validation;
}
