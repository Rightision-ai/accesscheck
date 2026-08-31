import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type { RateCardUnit } from "@/lib/rate-cards/types";
import type {
  AdaptationPlanSet,
  CostBasis,
  Difficulty,
  DfgBudgetGbp,
  DroppedAdaptation,
  PlanLine,
  TierPlan,
  UnpricedWork,
} from "./types";

/**
 * The generated Row types widen the columns this module constrains: text columns with CHECK
 * constraints come back as `string`, and jsonb as `Json`. These aliases re-narrow them to the
 * domain unions, in one place, so the mappers below stay honest about what the database can
 * actually hold.
 */
type PlanRow = Omit<
  Database["public"]["Tables"]["adaptation_plans"]["Row"],
  | "overall_difficulty"
  | "potential_band"
  | "current_band"
  | "additional_works"
  | "dropped_candidates"
> & {
  overall_difficulty: Difficulty;
  potential_band: LahrBandId;
  current_band: LahrBandId;
  additional_works: UnpricedWork[] | null;
  dropped_candidates: DroppedAdaptation[] | null;
};

type LineRow = Omit<
  Database["public"]["Tables"]["adaptation_plan_lines"]["Row"],
  "difficulty" | "confidence_basis" | "feasibility" | "cost_basis" | "field_patches" | "source"
> & {
  difficulty: Difficulty;
  confidence_basis: "rate_card_match" | "model_estimate";
  feasibility: "feasible" | "conditional";
  cost_basis: CostBasis;
  field_patches: Record<string, unknown> | null;
  source: PlanLine["source"];
};

function toLine(row: LineRow): PlanLine {
  return {
    id: row.candidate_id,
    label: row.label,
    addressesRules: row.addresses_rules ?? [],
    cost: {
      lowGbp: row.cost_low_gbp,
      expectedGbp: row.cost_expected_gbp,
      highGbp: row.cost_high_gbp,
    },
    costBasis: {
      ...row.cost_basis,
      unit: (row.cost_basis?.unit ?? "each") as RateCardUnit,
    },
    durationDays: row.duration_days,
    difficulty: row.difficulty,
    trades: row.trades ?? [],
    ...(row.narrative ? { narrative: row.narrative } : {}),
    ...(row.preconditions ? { preconditions: row.preconditions } : {}),
    confidence: {
      score: Number(row.confidence),
      basis: row.confidence_basis,
      verifyOnSite: row.verify_on_site,
      ...(row.verify_note ? { verifyNote: row.verify_note } : {}),
    },
    fieldPatches: row.field_patches ?? {},
    feasibility: row.feasibility,
    dependsOn: row.depends_on ?? [],
    isInherited: row.is_inherited,
    selectionReason: row.selection_reason,
    source: row.source,
  };
}

/**
 * Load the persisted plan set for a survey.
 *
 * Lines for every tier come back in one query. The previous implementation issued one select
 * per tier — an N+1 on a page that renders on every case view.
 */
export async function loadAdaptationPlanSet(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<AdaptationPlanSet | null> {
  const plansResult = await supabase
    .from("adaptation_plans")
    .select("*")
    .eq("survey_id", surveyId);
  if (plansResult.error) return null;

  const planRows = ((plansResult.data ?? []) as PlanRow[]).sort(
    (a, b) => a.budget_gbp - b.budget_gbp,
  );
  if (planRows.length === 0) return null;

  const linesResult = await supabase
    .from("adaptation_plan_lines")
    .select("*")
    .in(
      "plan_id",
      planRows.map((plan) => plan.id),
    );
  if (linesResult.error) return null;

  const linesByPlan = new Map<string, LineRow[]>();
  for (const row of (linesResult.data ?? []) as LineRow[]) {
    const bucket = linesByPlan.get(row.plan_id) ?? [];
    bucket.push(row);
    linesByPlan.set(row.plan_id, bucket);
  }

  const tiers: TierPlan[] = planRows.map((plan) => ({
    budgetGbp: plan.budget_gbp as DfgBudgetGbp,
    totalCost: {
      lowGbp: plan.total_cost_low_gbp,
      expectedGbp: plan.total_cost_expected_gbp,
      highGbp: plan.total_cost_high_gbp,
    },
    totalDurationDays: plan.total_duration_days,
    overallDifficulty: plan.overall_difficulty,
    potentialBand: plan.potential_band,
    rulesCleared: plan.rules_cleared ?? [],
    rulesRemaining: plan.rules_remaining ?? [],
    lines: (linesByPlan.get(plan.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map(toLine),
    droppedCandidates: plan.dropped_candidates ?? [],
    ...(plan.unavailable_reason ? { unavailableReason: plan.unavailable_reason } : {}),
  }));

  // Run-level metadata is duplicated across the tier rows; read it from the first.
  const meta = planRows[0];
  return {
    currentBand: meta.current_band,
    tiers,
    additionalWorks: meta.additional_works ?? [],
    reachesBandAAt30k: meta.reaches_band_a_at_30k,
    ...(meta.rationale_if_not_band_a
      ? { rationaleIfNotBandA: meta.rationale_if_not_band_a }
      : {}),
    overallNarrative: meta.overall_narrative,
    generatedAt: meta.generated_at,
    engineModel: meta.engine_model,
    budgetCapGbp: meta.budget_cap_gbp,
    rateCardId: meta.rate_card_id,
    rateCardLabel: meta.rate_card_label,
    rateCardEffectiveFrom: meta.rate_card_effective_from ?? "",
  };
}

export async function clearAdaptationPlanSet(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<void> {
  await supabase.from("adaptation_plans").delete().eq("survey_id", surveyId);
}

/**
 * Replace a survey's plan set in one transaction.
 *
 * Delegates to the `replace_adaptation_plan` SQL function rather than looping deletes and
 * inserts from the client: a failure partway through the old loop left some tiers persisted and
 * some missing, and the UI rendered the remnant as a complete plan.
 */
export async function persistAdaptationPlanSet(
  supabase: SupabaseClient<Database>,
  surveyId: number,
  organisationId: string,
  planSet: AdaptationPlanSet,
): Promise<void> {
  const { error } = await supabase.rpc("replace_adaptation_plan", {
    target_survey_id: surveyId,
    target_organisation_id: organisationId,
    payload: planSet as unknown as Json,
  });

  if (error) {
    throw new Error(`Failed to persist adaptation plan: ${error.message ?? "unknown error"}`);
  }
}
