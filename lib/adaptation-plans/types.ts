import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type { Difficulty, RateCardUnit } from "@/lib/rate-cards/types";

export type { Difficulty };

export const DFG_BUDGET_TIERS = [15000, 20000, 30000] as const;
export type DfgBudgetGbp = (typeof DFG_BUDGET_TIERS)[number];
export const DFG_MAX_BUDGET: DfgBudgetGbp = 30000;

/**
 * A point estimate implies a precision the evidence does not support, and an experienced
 * surveyor reads it as naive. Every cost in the plan is a range.
 */
export type CostRange = { lowGbp: number; expectedGbp: number; highGbp: number };

/** Where a price came from. Rendered verbatim: "Priced from: …". */
export type CostBasis = {
  /** null ⇒ unpriced, quote required. */
  workItemCode: string | null;
  quantity: number;
  unit: RateCardUnit;
  rateCardId: string | null;
  rateCardLabel: string;
  regionMultiplier: number;
  effectiveFrom: string;
};

/**
 * Replaces the single plan-level confidence bar. A wet-room conversion inferred from one
 * photograph and a threshold ramp measured on site do not deserve the same number.
 */
export type LineConfidence = {
  score: number;
  basis: "rate_card_match" | "model_estimate";
  verifyOnSite: boolean;
  verifyNote?: string;
};

/**
 * One priced, feasible option for this property. The pool is generated once with no budget
 * framing; tiers are then selected from it deterministically.
 */
export type AdaptationCandidate = {
  id: string;
  label: string;
  /** Intersected with the rules actually firing on this survey — a line never claims a rule
   *  that is not currently capping the band. */
  addressesRules: number[];
  cost: CostRange;
  costBasis: CostBasis;
  durationDays: number;
  difficulty: Difficulty;
  trades: string[];
  narrative?: string;
  /** Free text in Phase 1; typed constraints are Tier 3. */
  preconditions?: string;
  confidence: LineConfidence;
  /** Always from the rate-card item, never from the model. */
  fieldPatches: Record<string, unknown>;
  feasibility: "feasible" | "conditional";
  /** Candidate ids that must be selected before this one. */
  dependsOn: string[];
};

export type PlanLine = AdaptationCandidate & {
  /** Carried forward from the tier below. */
  isInherited: boolean;
  /** "Included because it clears rules 25 and 26 for £1,800 — the cheapest route to that pair." */
  selectionReason: string;
  /** Phase 2 turns these on; carried now so editing needs no further migration. */
  source: "ai_suggested" | "professional_amended" | "professional_added";
};

/**
 * Work the model proposed that no schedule-of-rates line prices. Never selected, never summed into a
 * total, never patched into the survey, never affects the band — an unpriced guess must not
 * pollute the band arithmetic. Surfaced as "Additional works identified — quote required".
 */
export type UnpricedWork = {
  label: string;
  narrative?: string;
  proposedWorkItem: string;
  reason: string;
};

export type DroppedAdaptation = { label: string; reason: string };

export type TierPlan = {
  budgetGbp: DfgBudgetGbp;
  totalCost: CostRange;
  totalDurationDays: number;
  overallDifficulty: Difficulty;
  potentialBand: LahrBandId;
  rulesCleared: number[];
  rulesRemaining: number[];
  lines: PlanLine[];
  droppedCandidates: DroppedAdaptation[];
  unavailableReason?: string;
};

export type AdaptationPlanSet = {
  currentBand: LahrBandId;
  tiers: TierPlan[];
  additionalWorks: UnpricedWork[];
  reachesBandAAt30k: boolean;
  rationaleIfNotBandA?: string;
  overallNarrative: string;
  generatedAt: string;
  engineModel: string;
  budgetCapGbp: number;
  rateCardId: string | null;
  rateCardLabel: string;
  rateCardEffectiveFrom: string;
};

export const ZERO_COST: CostRange = { lowGbp: 0, expectedGbp: 0, highGbp: 0 };

export function sumCostRange(items: { cost: CostRange }[]): CostRange {
  return items.reduce<CostRange>(
    (total, item) => ({
      lowGbp: total.lowGbp + item.cost.lowGbp,
      expectedGbp: total.expectedGbp + item.cost.expectedGbp,
      highGbp: total.highGbp + item.cost.highGbp,
    }),
    { ...ZERO_COST },
  );
}
