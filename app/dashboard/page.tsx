import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import {
  buildAssessmentSummary,
  buildBandDistribution,
  buildWeeklyTrend,
  type AssessmentAnalyticsRow,
} from "@/lib/assessments/analytics";
import type { Case } from "@/types/dashboard";
import type { AssessmentStatus } from "@/types/accesscheck";
import DashboardClient from "./DashboardClient";
import { signStorageRefsDeep } from "@/lib/storage/signing";

export default async function DashboardPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const db = asLooseClient(await createClient());
  const [surveysResult, recentResult] = await Promise.all([
    db.from("surveys").select("id,created_at,updated_at,completed_at,status,assessment_readiness,overall_grade").eq("organisation_id", context.organisationId),
    db.from("surveys").select("*").eq("organisation_id", context.organisationId).order("updated_at", { ascending: false }).limit(8),
  ]);
  const analytics = (surveysResult.data ?? []) as AssessmentAnalyticsRow[];
  // Rows are already scoped to the viewer's organisation by the query above, so
  // signing their private media refs here exposes nothing they cannot see.
  const cases: Case[] = await signStorageRefsDeep(((recentResult.data ?? []) as Array<Record<string, unknown>>).map((survey) => {
    const raw = (survey.raw_ai_data && typeof survey.raw_ai_data === "object" ? survey.raw_ai_data : {}) as Case["mlData"];
    return {
      id: String(survey.id),
      applicantName: String(survey.inspector_name || "Not recorded"),
      address: [survey.door_number, survey.street_number, survey.building_name, survey.street].filter(Boolean).join(" ") || "Address pending",
      city: "",
      postcode: String(survey.postcode || ""),
      assessmentDate: String(survey.inspection_date || survey.created_at || ""),
      aiScore: survey.compliance_score == null ? null : Number(survey.compliance_score),
      status: String(survey.status || "draft") as AssessmentStatus,
      source: "Assessment",
      date: String(survey.created_at || ""),
      thumbnail: String(survey.thumbnail_url || ""),
      evidence: [],
      description: String(survey.comments || ""),
      mlData: { ...raw, surveyRow: survey },
    };
  }));

  return (
    <DashboardClient
      initialCases={cases}
      summary={buildAssessmentSummary(analytics)}
      weeklyTrend={buildWeeklyTrend(analytics)}
      bandDistribution={buildBandDistribution(analytics)}
      canAuthor={context.isPlatformAdmin || context.permissions.includes("author")}
    />
  );
}
