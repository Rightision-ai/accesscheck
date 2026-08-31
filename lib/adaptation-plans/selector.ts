import type { Database } from "@/types/supabase";
import { rankOf, type LahrBandId } from "@/lib/accessibility/lahr/types";
import {
  aggregateDifficulty,
  applyPatchesToSurvey,
  difficultyRank,
  projectBandAfter,
  triggeredRuleNumbers,
} from "./planner";
import { sumCostRange, type AdaptationCandidate, type CostRange } from "./types";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

/** How many of the best single moves get a partner tried alongside them. */
const DEFAULT_LOOK_AHEAD_WIDTH = 4;

export type BundleScore = {
  band: LahrBandId;
  bandUplift: number;
  rulesCleared: number[];
  /** Rules the patches switched *on*. Widening a toilet in one dimension can move it from one
   *  size rule to another; without tracking this the bundle would score a clear it never made. */
  rulesIntroduced: number[];
  /** Cleared minus introduced — the honest measure of progress. */
  netRulesCleared: number;
  cost: CostRange;
  durationDays: number;
  difficultyRank: number;
};

export type SelectionOutcome = {
  selected: AdaptationCandidate[];
  score: BundleScore;
  dropped: { label: string; reason: string }[];
  evaluations: number;
};

/**
 * Score a bundle against the survey.
 *
 * Band alone is the wrong objective: the band is the *worst* section, so clearing one section's
 * rules often moves nothing and a greedy search stalls immediately. Counting cleared rules
 * alongside the band lets the search make progress across a plateau and reach the uplift.
 */
export function evaluateBundle(
  survey: Partial<SurveyRow>,
  currentBand: LahrBandId,
  bundle: AdaptationCandidate[],
): BundleScore {
  const before = triggeredRuleNumbers(survey);
  const after = triggeredRuleNumbers(applyPatchesToSurvey(survey, bundle));
  const band = projectBandAfter(survey, bundle);

  const rulesCleared = [...before].filter((rule) => !after.has(rule)).sort((a, b) => a - b);
  const rulesIntroduced = [...after].filter((rule) => !before.has(rule)).sort((a, b) => a - b);

  return {
    band,
    // rankOf is worse-is-higher (A:1 … G:99), so a drop in rank is an improvement.
    bandUplift: rankOf(currentBand) - rankOf(band),
    rulesCleared,
    rulesIntroduced,
    netRulesCleared: rulesCleared.length - rulesIntroduced.length,
    cost: sumCostRange(bundle),
    durationDays: bundle.reduce((total, item) => total + item.durationDays, 0),
    difficultyRank: difficultyRank(aggregateDifficulty(bundle)),
  };
}

/**
 * Lexicographic comparison, best first. Negative means `a` is better.
 *
 * Criteria 1 and 2 are the objective; 3 to 6 only break ties. Criterion 6 makes the whole
 * selection a pure function of its inputs, which is what allows a golden fixture.
 *
 * Criterion 2 is NET rules cleared. Counting gross clears would let the search pay for a
 * lateral move — widening a toilet in one dimension clears the "A > B and A is short" rule and
 * immediately trips the "B > A and B is short" one, for no gain.
 */
function compare(
  a: { score: BundleScore; ids: string[] },
  b: { score: BundleScore; ids: string[] },
): number {
  return (
    b.score.bandUplift - a.score.bandUplift ||
    b.score.netRulesCleared - a.score.netRulesCleared ||
    a.score.cost.expectedGbp - b.score.cost.expectedGbp ||
    a.score.durationDays - b.score.durationDays ||
    a.score.difficultyRank - b.score.difficultyRank ||
    a.ids.join(",").localeCompare(b.ids.join(","))
  );
}

function improves(next: BundleScore, current: BundleScore): boolean {
  return (
    next.bandUplift > current.bandUplift ||
    next.netRulesCleared > current.netRulesCleared
  );
}

/**
 * A candidate plus every unmet prerequisite it transitively needs.
 *
 * Returns null when the closure cannot be satisfied — an unknown or already-dropped
 * prerequisite, or a dependency cycle. A cycle would otherwise be an infinite walk, so it is
 * detected here rather than guarded for in the search loop.
 */
function closureOf(
  candidate: AdaptationCandidate,
  byId: ReadonlyMap<string, AdaptationCandidate>,
  selectedIds: ReadonlySet<string>,
): AdaptationCandidate[] | null {
  const collected: AdaptationCandidate[] = [];
  const seen = new Set<string>();
  const onPath = new Set<string>();

  const walk = (node: AdaptationCandidate): boolean => {
    if (selectedIds.has(node.id) || seen.has(node.id)) return true;
    if (onPath.has(node.id)) return false; // cycle
    onPath.add(node.id);
    for (const dependencyId of node.dependsOn) {
      if (selectedIds.has(dependencyId)) continue;
      const dependency = byId.get(dependencyId);
      if (!dependency || !walk(dependency)) return false;
    }
    onPath.delete(node.id);
    seen.add(node.id);
    collected.push(node);
    return true;
  };

  return walk(candidate) ? collected : null;
}

/**
 * Fill one budget tier, starting from the tier below.
 *
 * `seed` is never removed, which is what makes cumulativity structural: tier N is always a
 * superset of tier N-1, so there is no post-hoc pass to enforce it and no way for a wording
 * change to duplicate and double-charge an item.
 */
export function selectTier(args: {
  survey: Partial<SurveyRow>;
  currentBand: LahrBandId;
  pool: AdaptationCandidate[];
  budgetGbp: number;
  seed: AdaptationCandidate[];
  lookAheadWidth?: number;
}): SelectionOutcome {
  const { survey, currentBand, pool, budgetGbp, seed } = args;
  const lookAheadWidth = args.lookAheadWidth ?? DEFAULT_LOOK_AHEAD_WIDTH;

  const byId = new Map(pool.map((candidate) => [candidate.id, candidate]));
  const selected = [...seed];
  const selectedIds = new Set(selected.map((candidate) => candidate.id));
  const dropped = new Map<string, string>();

  let evaluations = 0;
  const cache = new Map<string, BundleScore>();
  const scoreOf = (bundle: AdaptationCandidate[]): BundleScore => {
    const key = bundle
      .map((candidate) => candidate.id)
      .sort()
      .join("|");
    const cached = cache.get(key);
    if (cached) return cached;
    evaluations++;
    const score = evaluateBundle(survey, currentBand, bundle);
    cache.set(key, score);
    return score;
  };

  let current = scoreOf(selected);

  for (;;) {
    const affordable: { step: AdaptationCandidate[]; score: BundleScore; ids: string[] }[] = [];

    for (const candidate of pool) {
      if (selectedIds.has(candidate.id)) continue;
      const step = closureOf(candidate, byId, selectedIds);
      if (!step) {
        dropped.set(
          candidate.label,
          "Depends on work that is not available on this property.",
        );
        continue;
      }
      const next = [...selected, ...step];
      if (sumCostRange(next).expectedGbp > budgetGbp) continue;

      const score = scoreOf(next);
      // A patch can switch a rule *on* — a ramp at a bad gradient trips a gradient section
      // that was never evaluated before. Reject the candidate rather than suppress the tier.
      if (rankOf(score.band) > rankOf(current.band)) {
        dropped.set(
          candidate.label,
          `Would re-trigger an Accessible Housing Rules cap, worsening the projected band to ${score.band}.`,
        );
        continue;
      }
      affordable.push({
        step,
        score,
        ids: step.map((item) => item.id).sort(),
      });
    }

    affordable.sort(compare);
    let best = affordable[0];

    // Only pair up when no single move helps. Some rules need two works together — a wet room
    // does not clear the bathroom block while the WC still lacks lateral transfer space.
    if (!best || !improves(best.score, current)) {
      let bestPair: { step: AdaptationCandidate[]; score: BundleScore; ids: string[] } | undefined;
      for (const first of affordable.slice(0, lookAheadWidth)) {
        const firstIds = new Set(first.step.map((item) => item.id));
        for (const candidate of pool) {
          if (selectedIds.has(candidate.id) || firstIds.has(candidate.id)) continue;
          const partner = closureOf(candidate, byId, selectedIds);
          if (!partner) continue;
          const step = [
            ...first.step,
            ...partner.filter((item) => !firstIds.has(item.id)),
          ];
          const next = [...selected, ...step];
          if (sumCostRange(next).expectedGbp > budgetGbp) continue;
          const score = scoreOf(next);
          if (rankOf(score.band) > rankOf(current.band)) continue;
          const entry = { step, score, ids: step.map((item) => item.id).sort() };
          if (!bestPair || compare(entry, bestPair) < 0) bestPair = entry;
        }
      }
      if (bestPair && improves(bestPair.score, current)) best = bestPair;
    }

    if (!best || !improves(best.score, current)) break;

    for (const item of best.step) {
      selected.push(item);
      selectedIds.add(item.id);
      dropped.delete(item.label);
    }
    current = best.score;
  }

  return {
    selected,
    score: current,
    dropped: [...dropped].map(([label, reason]) => ({ label, reason })),
    evaluations,
  };
}

/**
 * Fill every tier in ascending budget order, each seeded from the one below.
 *
 * The pool is sorted by id first so the result does not depend on the order the model happened
 * to emit its candidates in.
 */
export function selectTiers(args: {
  survey: Partial<SurveyRow>;
  currentBand: LahrBandId;
  pool: AdaptationCandidate[];
  budgets: readonly number[];
  lookAheadWidth?: number;
}): { outcomes: SelectionOutcome[]; evaluations: number } {
  const pool = [...args.pool].sort((a, b) => a.id.localeCompare(b.id));
  const budgets = [...args.budgets].sort((a, b) => a - b);

  const outcomes: SelectionOutcome[] = [];
  let seed: AdaptationCandidate[] = [];
  let evaluations = 0;

  for (const budgetGbp of budgets) {
    const outcome = selectTier({
      survey: args.survey,
      currentBand: args.currentBand,
      pool,
      budgetGbp,
      seed,
      lookAheadWidth: args.lookAheadWidth,
    });
    outcomes.push(outcome);
    evaluations += outcome.evaluations;
    seed = outcome.selected;
  }

  return { outcomes, evaluations };
}
