import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import {
  buildAssessmentSummary,
  buildBandDistribution,
  buildMemberWorkload,
  buildWeeklyTrend,
  type AssessmentAnalyticsRow,
  type WorkloadMember,
} from "@/lib/assessments/analytics";
import type { Case } from "@/types/dashboard";
import type { AssessmentStatus } from "@/types/accesscheck";
import DashboardClient from "./DashboardClient";
import { signStorageRefsDeep } from "@/lib/storage/signing";
import { applySurveyVisibility } from "@/lib/surveys/visibility";

export default async function DashboardPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const db = asLooseClient(await createClient());
  // Only an admin sees the team breakdown; anyone else is looking at their own work, and
  // the member list would tell them nothing they are entitled to act on.
  const isAdmin = context.isPlatformAdmin || context.permissions.includes("admin");
  // An author's counts must match the cases they can actually open, so the
  // analytics query is narrowed exactly like the list is.
  const [surveysResult, recentResult, membersResult] = await Promise.all([
    applySurveyVisibility(db.from("surveys").select("id,user_id,created_at,updated_at,completed_at,status,assessment_readiness,overall_grade").eq("organisation_id", context.organisationId), context),
    applySurveyVisibility(db.from("surveys").select("*").eq("organisation_id", context.organisationId), context).order("updated_at", { ascending: false }).limit(8),
    isAdmin
      ? db.from("organisation_members").select("id,user_id,first_name,last_name,avatar_url").eq("organisation_id", context.organisationId).eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);
  const analytics = (surveysResult.data ?? []) as AssessmentAnalyticsRow[];
  const teamWorkload = isAdmin
    ? buildMemberWorkload(analytics, (membersResult.data ?? []) as WorkloadMember[])
    : null;
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
      teamWorkload={teamWorkload}
      canAuthor={context.isPlatformAdmin || context.permissions.includes("author")}
    />
  );
}
