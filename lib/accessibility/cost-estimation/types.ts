import type { LahrBandId } from "@/lib/accessibility/lahr/types";

export type Difficulty = "minor" | "moderate" | "major";

export const DFG_BUDGET_TIERS = [15000, 20000, 30000] as const;
export type DfgBudgetGbp = (typeof DFG_BUDGET_TIERS)[number];
export const DFG_MAX_BUDGET: DfgBudgetGbp = 30000;

export type RemediationInstance = {
  label: string;
  addressesRules: number[];
  costGbp: number;
  durationDays: number;
  difficulty: Difficulty;
  trades: string[];
  narrative?: string;
  preconditions?: string;
  visualEvidenceConfidence?: number;
  fieldPatches: Record<string, unknown>;
  /** True when this adaptation was carried forward from a lower-tier plan. */
  isInherited?: boolean;
};

export type DroppedAdaptation = {
  label: string;
  reason: string;
};

export type TierPlan = {
  budgetGbp: DfgBudgetGbp;
  totalCostGbp: number;
  totalDurationDays: number;
  overallDifficulty: Difficulty;
  potentialBand: LahrBandId;
  adaptations: RemediationInstance[];
  droppedCandidates: DroppedAdaptation[];
  /** When `adaptations` is empty, a plain-English explanation of why no plan exists for this
   *  tier (insufficient budget, structural infeasibility, etc.). Surfaced to the OT instead of
   *  hiding the tier. */
  unavailableReason?: string;
};

export type CostEstimation = {
  currentBand: LahrBandId;
  tiers: TierPlan[];
  reachesBandAAt30k: boolean;
  rationaleIfNotBandA?: string;
  overallNarrative: string;
  confidence: number;
  generatedAt: string;
  geminiModel: string;
  budgetCapGbp: number;
};
