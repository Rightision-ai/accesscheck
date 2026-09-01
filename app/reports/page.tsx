import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import {
  buildAssessmentSummary,
  buildBandDistribution,
  buildWeeklyTrend,
  type AssessmentAnalyticsRow,
  type WorkloadMember,
} from "@/lib/assessments/analytics";
import {
  buildCostSummary,
  buildMemberActivity,
  buildTopImprovements,
  pickHeadlinePlans,
  pickTopMember,
  type PlanLineRow,
  type PlanRow,
} from "@/lib/reports/analytics";
import { applySurveyVisibility } from "@/lib/surveys/visibility";
import ReportsClient from "./ReportsClient";

/** PostgREST caps a URL-encoded `in` list; chunking keeps the plan lookup honest for big ranges. */
const ID_CHUNK = 200;

const chunk = <T,>(values: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, index * size + size),
  );

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = typeof params.from === "string" ? params.from : defaultFrom.toISOString().slice(0, 10);
  const isAdmin = context.isPlatformAdmin || context.permissions.includes("admin");

  const db = asLooseClient(await createClient());
  const [surveysResult, membersResult] = await Promise.all([
    applySurveyVisibility(
      db
        .from("surveys")
        .select("id,user_id,created_at,updated_at,completed_at,status,assessment_readiness,overall_grade")
        .eq("organisation_id", context.organisationId),
      context,
    )
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59.999Z`),
    // Member figures are an admin view, for the same reason the dashboard's workload card is.
    isAdmin
      ? db
          .from("organisation_members")
          .select("id,user_id,first_name,last_name,avatar_url")
          .eq("organisation_id", context.organisationId)
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);

  const rows = (surveysResult.data ?? []) as AssessmentAnalyticsRow[];
  const surveyIds = rows.map((row) => row.id);

  // Adaptation plans hang off the surveys in range, so an empty range skips the lookup.
  let plans: PlanRow[] = [];
  let lines: PlanLineRow[] = [];
  if (surveyIds.length > 0) {
    const planResults = await Promise.all(
      chunk(surveyIds, ID_CHUNK).map((ids) =>
        db
          .from("adaptation_plans")
          .select("id,survey_id,budget_gbp,total_cost_expected_gbp,total_cost_low_gbp,total_cost_high_gbp,current_band,potential_band")
          .eq("organisation_id", context.organisationId)
          .in("survey_id", ids),
      ),
    );
    plans = planResults.flatMap((result) => (result.data ?? []) as PlanRow[]);

    // Only the headline plan per case feeds the works breakdown; the other tiers describe
    // the same property and would count each piece of work two more times.
    const headlineIds = pickHeadlinePlans(plans).map((plan) => plan.id);
    if (headlineIds.length > 0) {
      const lineResults = await Promise.all(
        chunk(headlineIds, ID_CHUNK).map((ids) =>
          db.from("adaptation_plan_lines").select("plan_id,label,cost_expected_gbp,difficulty").in("plan_id", ids),
        ),
      );
      lines = lineResults.flatMap((result) => (result.data ?? []) as PlanLineRow[]);
    }
  }

  const members = (membersResult.data ?? []) as WorkloadMember[];
  const activity = isAdmin ? buildMemberActivity(rows, members) : [];
  const headlinePlanIds = new Set(pickHeadlinePlans(plans).map((plan) => plan.id));

  return (
    <ReportsClient
      range={{ from, to }}
      organisationName={context.organisationName}
      summary={buildAssessmentSummary(rows)}
      trend={buildWeeklyTrend(rows)}
      bands={buildBandDistribution(rows)}
      cost={buildCostSummary(plans)}
      improvements={buildTopImprovements(lines, headlinePlanIds)}
      activity={activity}
      topMember={pickTopMember(activity)}
      csvHref={`/api/reports/assessments?${new URLSearchParams({ from, to, format: "csv" })}`}
      isAdmin={isAdmin}
    />
  );
}
