import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import CaseDetailView from "./CaseDetailView";
import { mapSurveyToCase } from "@/lib/surveys/mapper";

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
    console.error("Error fetching survey:", error);
    // Handle error or redirect
    return (
      <div className="p-8 text-center text-red-600">
        Case not found or error loading case.
      </div>
    );
  }

  const caseData = mapSurveyToCase(survey);

  return <CaseDetailView caseData={caseData} />;
}
