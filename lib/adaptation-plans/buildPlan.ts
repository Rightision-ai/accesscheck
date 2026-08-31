import type { Database } from "@/types/supabase";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type { RateCard } from "@/lib/rate-cards/types";
import {
  fallbackOverallNarrative,
  isCheapestForItsRules,
  selectionReasonFor,
  unavailableReasonFor,
} from "./narrative";
import { aggregateDifficulty, triggeredRuleNumbers } from "./planner";
import { selectTiers } from "./selector";
import {
  sumCostRange,
  DFG_MAX_BUDGET,
  type AdaptationCandidate,
  type AdaptationPlanSet,
  type DfgBudgetGbp,
  type DroppedAdaptation,
  type PlanLine,
  type TierPlan,
  type UnpricedWork,
  ZERO_COST,
} from "./types";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

export function buildAdaptationPlanSet(args: {
  survey: Partial<SurveyRow>;
  currentBand: LahrBandId;
  pool: AdaptationCandidate[];
  budgets: readonly DfgBudgetGbp[];
  rateCard: RateCard;
  engineModel: string;
  additionalWorks: UnpricedWork[];
  poolDropped: DroppedAdaptation[];
  overallNarrative?: string;
  rationaleIfNotBandA?: string;
  generatedAt?: string;
}): AdaptationPlanSet {
  const { survey, currentBand, pool, budgets, rateCard } = args;

  const { outcomes } = selectTiers({ survey, currentBand, pool, budgets });
  const triggered = [...triggeredRuleNumbers(survey)].sort((a, b) => a - b);

  const tiers: TierPlan[] = outcomes.map((outcome, index) => {
    const budgetGbp = budgets[index];
    const previousBudgetGbp = index > 0 ? budgets[index - 1] : undefined;
    const previousIds = new Set(
      index > 0 ? outcomes[index - 1].selected.map((line) => line.id) : [],
    );

    const lines: PlanLine[] = outcome.selected.map((candidate) => {
      const isInherited = previousIds.has(candidate.id);
      return {
        ...candidate,
        isInherited,
        selectionReason: selectionReasonFor({
          candidate,
          isInherited,
          previousBudgetGbp,
          cheapestForItsRules: isCheapestForItsRules(candidate, pool),
        }),
        source: "ai_suggested",
      };
    });

    const cleared = new Set(outcome.score.rulesCleared);
    const rulesRemaining = triggered.filter((rule) => !cleared.has(rule));
    const hasNewWork = lines.some((line) => !line.isInherited);

    return {
      budgetGbp,
      totalCost: lines.length > 0 ? sumCostRange(lines) : { ...ZERO_COST },
      totalDurationDays: lines.reduce((total, line) => total + line.durationDays, 0),
      overallDifficulty: aggregateDifficulty(lines),
      potentialBand: outcome.score.band,
      rulesCleared: outcome.score.rulesCleared,
      rulesRemaining,
      lines,
      droppedCandidates: [...args.poolDropped, ...outcome.dropped].slice(0, 12),
      // A tier that adds nothing new keeps the lower tier's lines and says why, rather than
      // rendering empty while claiming the band those lines bought.
      ...(hasNewWork
        ? {}
        : (() => {
            const reason = unavailableReasonFor({
              budgetGbp,
              previousBudgetGbp,
              pool,
              selectedIds: new Set(outcome.selected.map((line) => line.id)),
              rulesRemaining,
              spentGbp: sumCostRange(outcome.selected).expectedGbp,
              anyWouldWorsenBand: outcome.dropped.some((drop) =>
                /re-trigger/i.test(drop.reason),
              ),
            });
            return reason ? { unavailableReason: reason } : {};
          })()),
    };
  });

  const top = tiers[tiers.length - 1];
  const reachesBandAAt30k = top?.potentialBand === "A";

  return {
    currentBand,
    tiers,
    additionalWorks: args.additionalWorks,
    reachesBandAAt30k,
    ...(reachesBandAAt30k
      ? {}
      : args.rationaleIfNotBandA
        ? { rationaleIfNotBandA: args.rationaleIfNotBandA }
        : {}),
    overallNarrative:
      args.overallNarrative ??
      fallbackOverallNarrative({
        currentBand,
        projectedBand: top?.potentialBand ?? currentBand,
        lineCount: top?.lines.length ?? 0,
      }),
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    engineModel: args.engineModel,
    budgetCapGbp: DFG_MAX_BUDGET,
    rateCardId: rateCard.id,
    rateCardLabel: rateCard.label,
    rateCardEffectiveFrom: rateCard.effectiveFrom,
  };
}
