import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import CaseDetailView from "./CaseDetailView";
import { mapSurveyToCase } from "@/lib/surveys/mapper";
import { loadCostEstimation } from "@/lib/accessibility/cost-estimation/repository";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const surveyId = parseInt(id, 10);
  if (Number.isNaN(surveyId)) {
    return <div className="p-8 text-center text-red-600">Invalid case ID.</div>;
  }
  const { data: survey, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .single();

  if (error || !survey) {
    if (error?.code !== "PGRST116") {
      console.error("Error fetching survey:", error);
    }
    // Handle error or redirect
    return (
      <div className="p-8 text-center text-red-600">
        Case not found or error loading case.
      </div>
    );
  }

  const caseData = mapSurveyToCase(survey);
  const costEstimation = await loadCostEstimation(supabase, surveyId);

  // If a regen is in flight (or just failed), surface that to the client so the cost-estimation
  // panel can show the loading state instead of the now-stale persisted plan. Stored in a
  // dedicated column (migration 20260427120000) that the touch trigger ignores.
  const jobStatus = (survey as { cost_estimation_status?: { status?: string } | null })
    ?.cost_estimation_status;
  const costEstimationJobStatus =
    jobStatus?.status === "pending" || jobStatus?.status === "failed"
      ? jobStatus.status
      : null;

  return (
    <CaseDetailView
      caseData={caseData}
      costEstimation={costEstimation}
      costEstimationJobStatus={costEstimationJobStatus}
    />
  );
}
