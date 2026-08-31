import { formatCostRange } from "@/lib/rate-cards/pricing";
import type { AdaptationCandidate } from "./types";

export { formatCostRange };

function gbp(value: number): string {
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

function ruleList(rules: number[]): string {
  if (rules.length === 1) return `rule ${rules[0]}`;
  if (rules.length === 2) return `rules ${rules[0]} and ${rules[1]}`;
  return `rules ${rules.slice(0, -1).join(", ")} and ${rules[rules.length - 1]}`;
}

/**
 * Why this line is in the plan.
 *
 * The spec asks for selection to be explainable — "included because it clears rules 12 and 14
 * for £2,100 — the cheapest route to that pair". The sentence is generated from what the
 * selector actually did, never from the model, so it cannot drift from the arithmetic.
 */
export function selectionReasonFor(args: {
  candidate: AdaptationCandidate;
  isInherited: boolean;
  previousBudgetGbp?: number;
  cheapestForItsRules: boolean;
}): string {
  const { candidate, isInherited, previousBudgetGbp, cheapestForItsRules } = args;

  if (isInherited && previousBudgetGbp !== undefined) {
    return `Carried forward from the ${gbp(previousBudgetGbp)} plan.`;
  }

  const cost = formatCostRange(candidate.cost);
  if (candidate.addressesRules.length === 0) {
    return `Included at ${cost} to support the rest of the works.`;
  }

  const clears = `Included because it clears Accessible Housing Rules ${ruleList(
    candidate.addressesRules,
  )} for ${cost}`;
  return cheapestForItsRules
    ? `${clears} — the cheapest route to that ${candidate.addressesRules.length > 1 ? "set" : "rule"}.`
    : `${clears}.`;
}

/** Whether nothing else in the pool clears the same rules more cheaply. */
export function isCheapestForItsRules(
  candidate: AdaptationCandidate,
  pool: AdaptationCandidate[],
): boolean {
  if (candidate.addressesRules.length === 0) return false;
  const target = new Set(candidate.addressesRules);
  return !pool.some(
    (other) =>
      other.id !== candidate.id &&
      other.cost.expectedGbp < candidate.cost.expectedGbp &&
      candidate.addressesRules.every((rule) => other.addressesRules.includes(rule)) &&
      target.size <= other.addressesRules.length,
  );
}

/**
 * Why a tier has no new work, in plain English.
 *
 * Generated deterministically from the pool rather than asked of the model — the old prompt
 * requested a `tier_unavailable_reason` and the model routinely produced one that contradicted
 * the arithmetic the code had just done.
 */
export function unavailableReasonFor(args: {
  budgetGbp: number;
  previousBudgetGbp?: number;
  pool: AdaptationCandidate[];
  selectedIds: ReadonlySet<string>;
  /** Rules still capping the band after this tier's selection. */
  rulesRemaining: readonly number[];
  spentGbp: number;
  anyWouldWorsenBand: boolean;
}): string | undefined {
  const { budgetGbp, previousBudgetGbp, pool, selectedIds, spentGbp, anyWouldWorsenBand } = args;
  const remainingRules = new Set(args.rulesRemaining);

  if (pool.length === 0) {
    return "No feasible adaptation was identified for this property from the visible evidence.";
  }

  const remaining = pool.filter((candidate) => !selectedIds.has(candidate.id));
  if (remaining.length === 0) {
    return previousBudgetGbp === undefined
      ? undefined
      : `Every feasible adaptation for this property is already included in the ${gbp(previousBudgetGbp)} plan.`;
  }

  // "Useful" means it would clear a rule that is STILL capping the band. A candidate whose
  // only rules the plan has already cleared is an alternative route to work already done.
  const useful = remaining.filter((candidate) =>
    candidate.addressesRules.some((rule) => remainingRules.has(rule)),
  );
  if (useful.length === 0) {
    return anyWouldWorsenBand
      ? `Every remaining option within ${gbp(budgetGbp)} would re-trigger an Accessible Housing Rules cap.`
      : `No remaining adaptation would clear an Accessible Housing Rules trigger on this property.`;
  }

  const cheapest = useful.reduce((min, candidate) =>
    candidate.cost.expectedGbp < min.cost.expectedGbp ? candidate : min,
  );
  const headroom = budgetGbp - spentGbp;

  if (cheapest.cost.expectedGbp > headroom) {
    return previousBudgetGbp === undefined
      ? `The cheapest work that clears an Accessible Housing Rules trigger here is ${cheapest.label.toLowerCase()} at about ${gbp(
          cheapest.cost.expectedGbp,
        )} — above the ${gbp(budgetGbp)} budget.`
      : `No additional adaptation is feasible within ${gbp(budgetGbp)} beyond those already in the ${gbp(
          previousBudgetGbp,
        )} plan — the next useful work, ${cheapest.label.toLowerCase()}, costs about ${gbp(
          cheapest.cost.expectedGbp,
        )} against ${gbp(headroom)} of headroom.`;
  }

  // Something affordable is left, but nothing that would resolve a further trigger — typically
  // an alternative route to a rule the plan has already cleared. Saying nothing here would
  // leave a tier silently identical to the one below it.
  return previousBudgetGbp === undefined
    ? `No adaptation within ${gbp(budgetGbp)} would clear a further Accessible Housing Rules trigger on this property.`
    : `Nothing further within ${gbp(budgetGbp)} would clear an additional Accessible Housing Rules trigger — the remaining options duplicate work already in the ${gbp(
        previousBudgetGbp,
      )} plan.`;
}

/** Fallback when the model returns no narrative of its own. */
export function fallbackOverallNarrative(args: {
  currentBand: string;
  projectedBand: string;
  lineCount: number;
}): string {
  if (args.lineCount === 0) {
    return `This property is currently band ${args.currentBand}. No adaptation within the Disabled Facilities Grant cap was found that would move it.`;
  }
  return args.projectedBand === args.currentBand
    ? `This property is currently band ${args.currentBand}. The works below clear several Accessible Housing Rules triggers but do not yet move the band, which is set by the worst-performing section.`
    : `This property is currently band ${args.currentBand}. The works below lift it to band ${args.projectedBand} within the Disabled Facilities Grant cap.`;
}
