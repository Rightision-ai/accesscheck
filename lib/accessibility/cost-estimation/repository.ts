import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type {
  CostEstimation,
  DfgBudgetGbp,
  Difficulty,
  DroppedAdaptation,
  RemediationInstance,
  TierPlan,
} from "./types";

/** The new cost-estimation tables aren't in the generated Supabase types yet
 *  (the migration is too new). We cast through `unknown` until the types are
 *  regenerated. */
type LooseSelectChain = {
  eq: (col: string, val: unknown) => Promise<{ data: unknown; error: unknown }>;
};
type LooseInsertChain = Promise<{ data: unknown; error: unknown }> & {
  select: (cols: string) => {
    single: () => Promise<{ data: unknown; error: unknown }>;
  };
};
type LooseClient = {
  from: (table: string) => {
    select: (cols: string) => LooseSelectChain;
    insert: (rows: unknown) => LooseInsertChain;
    delete: () => {
      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

type PlanRow = {
  id: string;
  survey_id: number;
  budget_gbp: number;
  total_cost_gbp: number;
  total_duration_days: number;
  overall_difficulty: Difficulty;
  potential_band: LahrBandId;
  current_band: LahrBandId;
  overall_narrative: string;
  reaches_band_a_at_30k: boolean;
  rationale_if_not_band_a: string | null;
  confidence: number | string;
  gemini_model: string;
  budget_cap_gbp: number;
  generated_at: string;
  dropped_candidates: DroppedAdaptation[] | null;
};

type AdaptationRow = {
  id: string;
  plan_id: string;
  position: number;
  label: string;
  addresses_rules: number[];
  cost_gbp: number;
  duration_days: number;
  difficulty: Difficulty;
  trades: string[];
  narrative: string | null;
  preconditions: string | null;
  visual_evidence_confidence: number | string | null;
  field_patches: Record<string, unknown>;
};

export async function loadCostEstimation(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<CostEstimation | null> {
  const client = supabase as unknown as LooseClient;

  const plansRes = await client
    .from("cost_estimation_plans")
    .select("*")
    .eq("survey_id", surveyId);
  if (plansRes.error) return null;
  const planRows = ((plansRes.data ?? []) as PlanRow[]).sort(
    (a, b) => a.budget_gbp - b.budget_gbp,
  );
  if (planRows.length === 0) return null;

  const tiers: TierPlan[] = [];
  for (const p of planRows) {
    const adapsRes = await client
      .from("cost_estimation_adaptations")
      .select("*")
      .eq("plan_id", p.id);
    const adapRows = ((adapsRes.data ?? []) as AdaptationRow[]).sort(
      (a, b) => a.position - b.position,
    );

    tiers.push({
      budgetGbp: p.budget_gbp as DfgBudgetGbp,
      totalCostGbp: p.total_cost_gbp,
      totalDurationDays: p.total_duration_days,
      overallDifficulty: p.overall_difficulty,
      potentialBand: p.potential_band,
      adaptations: adapRows.map(
        (a): RemediationInstance => ({
          label: a.label,
          addressesRules: a.addresses_rules ?? [],
          costGbp: a.cost_gbp,
          durationDays: a.duration_days,
          difficulty: a.difficulty,
          trades: a.trades ?? [],
          narrative: a.narrative ?? undefined,
          preconditions: a.preconditions ?? undefined,
          visualEvidenceConfidence:
            a.visual_evidence_confidence == null
              ? undefined
              : Number(a.visual_evidence_confidence),
          fieldPatches: a.field_patches ?? {},
        }),
      ),
      droppedCandidates: p.dropped_candidates ?? [],
    });
  }

  // Run-level metadata is duplicated across plan rows; pick from the first.
  const meta = planRows[0];
  return {
    currentBand: meta.current_band,
    tiers,
    reachesBandAAt30k: meta.reaches_band_a_at_30k,
    rationaleIfNotBandA: meta.rationale_if_not_band_a ?? undefined,
    overallNarrative: meta.overall_narrative,
    confidence: Number(meta.confidence),
    generatedAt: meta.generated_at,
    geminiModel: meta.gemini_model,
    budgetCapGbp: meta.budget_cap_gbp,
  };
}

export async function clearCostEstimation(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<void> {
  const client = supabase as unknown as LooseClient;
  await client.from("cost_estimation_plans").delete().eq("survey_id", surveyId);
}

function formatSupabaseError(err: unknown): string {
  if (!err) return "(no error object)";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    return [
      e.code ? `[${e.code}]` : null,
      e.message,
      e.details ? `details=${e.details}` : null,
      e.hint ? `hint=${e.hint}` : null,
    ]
      .filter(Boolean)
      .join(" ") || JSON.stringify(err);
  }
  return String(err);
}

export async function persistCostEstimation(
  supabase: SupabaseClient<Database>,
  surveyId: number,
  estimation: CostEstimation,
): Promise<void> {
  const client = supabase as unknown as LooseClient;

  await client.from("cost_estimation_plans").delete().eq("survey_id", surveyId);

  for (const tier of estimation.tiers) {
    const planInsert = await client
      .from("cost_estimation_plans")
      .insert({
        survey_id: surveyId,
        budget_gbp: tier.budgetGbp,
        total_cost_gbp: tier.totalCostGbp,
        total_duration_days: tier.totalDurationDays,
        overall_difficulty: tier.overallDifficulty,
        potential_band: tier.potentialBand,
        current_band: estimation.currentBand,
        overall_narrative: estimation.overallNarrative,
        reaches_band_a_at_30k: estimation.reachesBandAAt30k,
        rationale_if_not_band_a: estimation.rationaleIfNotBandA ?? null,
        confidence: estimation.confidence,
        gemini_model: estimation.geminiModel,
        budget_cap_gbp: estimation.budgetCapGbp,
        generated_at: estimation.generatedAt,
        dropped_candidates: tier.droppedCandidates,
      })
      .select("id")
      .single();
    if (planInsert.error || !planInsert.data) {
      throw new Error(
        `Failed to insert plan (budget=${tier.budgetGbp}): ${formatSupabaseError(planInsert.error)}`,
      );
    }
    const planId = (planInsert.data as { id: string }).id;

    if (tier.adaptations.length > 0) {
      const adaptRes = await client.from("cost_estimation_adaptations").insert(
        tier.adaptations.map((a, i) => ({
          plan_id: planId,
          position: i,
          label: a.label,
          addresses_rules: a.addressesRules,
          cost_gbp: a.costGbp,
          duration_days: a.durationDays,
          difficulty: a.difficulty,
          trades: a.trades,
          narrative: a.narrative ?? null,
          preconditions: a.preconditions ?? null,
          visual_evidence_confidence: a.visualEvidenceConfidence ?? null,
          field_patches: a.fieldPatches ?? {},
        })),
      );
      if (adaptRes.error) {
        throw new Error(
          `Failed to insert adaptations (budget=${tier.budgetGbp}, count=${tier.adaptations.length}): ${formatSupabaseError(adaptRes.error)}`,
        );
      }
    }
  }
}
