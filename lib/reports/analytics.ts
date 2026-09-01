import {
  buildMemberWorkload,
  median,
  type AssessmentAnalyticsRow,
  type MemberWorkload,
  type WorkloadMember,
} from "@/lib/assessments/analytics";
import { normalizeAssessmentStatus } from "@/lib/assessments/status";
import { LAHR_BAND_BY_ID, type LahrBandId } from "@/lib/accessibility/lahr/types";

/**
 * Organisation-level reporting: what the planned adaptations cost, which works come up
 * most often, and who is doing the work.
 *
 * Everything here is a pure function over rows the page has already fetched, so the same
 * figures can be unit-tested and, later, served from an export endpoint without a second
 * implementation drifting from the screen.
 */

/** The columns of `adaptation_plans` the reports need. */
export type PlanRow = {
  id: string;
  survey_id: number;
  budget_gbp: number;
  total_cost_expected_gbp: number;
  total_cost_low_gbp: number;
  total_cost_high_gbp: number;
  current_band: string;
  potential_band: string;
};

/** The columns of `adaptation_plan_lines` the reports need. */
export type PlanLineRow = {
  plan_id: string;
  label: string;
  cost_low_gbp: number;
  cost_expected_gbp: number;
  cost_high_gbp: number;
  difficulty: string;
};

/**
 * Every cost the planner produces is a range.
 *
 * A single figure implies a precision the evidence does not support, so the reports carry
 * the range and use the expected value as the one exact number in it.
 */
export type CostRange = { lowGbp: number; expectedGbp: number; highGbp: number };

const emptyRange = (): CostRange => ({ lowGbp: 0, expectedGbp: 0, highGbp: 0 });

const addRange = (total: CostRange, add: CostRange): CostRange => ({
  lowGbp: total.lowGbp + add.lowGbp,
  expectedGbp: total.expectedGbp + add.expectedGbp,
  highGbp: total.highGbp + add.highGbp,
});

const meanRange = (total: CostRange, count: number): CostRange | null =>
  count === 0
    ? null
    : {
        lowGbp: Math.round(total.lowGbp / count),
        expectedGbp: Math.round(total.expectedGbp / count),
        highGbp: Math.round(total.highGbp / count),
      };

const bandRank = (band: string): number =>
  LAHR_BAND_BY_ID[band?.trim().toUpperCase() as LahrBandId]?.order ?? Number.MAX_SAFE_INTEGER;

/** True when the plan moves the property to a better band than it starts on. */
export function isUplift(plan: Pick<PlanRow, "current_band" | "potential_band">): boolean {
  return bandRank(plan.potential_band) < bandRank(plan.current_band);
}

/**
 * One plan per case — the largest budget tier generated for it.
 *
 * A case has a plan per DFG tier (£15k/£20k/£30k), all describing the same property. Summing
 * every row would treble-count it, so the headline figures use the fullest plan and the tier
 * breakdown reports the others separately.
 */
export function pickHeadlinePlans(plans: PlanRow[]): PlanRow[] {
  const best = new Map<number, PlanRow>();
  for (const plan of plans) {
    const current = best.get(plan.survey_id);
    if (!current || plan.budget_gbp > current.budget_gbp) best.set(plan.survey_id, plan);
  }
  return [...best.values()];
}

export type CostSummary = {
  casesPlanned: number;
  /** Every headline plan added together, low, expected and high. */
  total: CostRange;
  /** The per-case mean of that range, or null when nothing was planned. */
  average: CostRange | null;
  /** The middle expected cost — a single case's figure, so it has no range. */
  medianExpectedGbp: number | null;
  upliftedCases: number;
  tiers: Array<{
    budgetGbp: number;
    cases: number;
    total: CostRange;
    average: CostRange | null;
    upliftedCases: number;
  }>;
};

const planRange = (plan: PlanRow): CostRange => ({
  lowGbp: plan.total_cost_low_gbp,
  expectedGbp: plan.total_cost_expected_gbp,
  highGbp: plan.total_cost_high_gbp,
});

export function buildCostSummary(plans: PlanRow[]): CostSummary {
  const headline = pickHeadlinePlans(plans);
  const total = headline.reduce((sum, plan) => addRange(sum, planRange(plan)), emptyRange());

  const byTier = new Map<number, PlanRow[]>();
  for (const plan of plans) {
    byTier.set(plan.budget_gbp, [...(byTier.get(plan.budget_gbp) ?? []), plan]);
  }

  return {
    casesPlanned: headline.length,
    total,
    average: meanRange(total, headline.length),
    medianExpectedGbp: median(headline.map((plan) => plan.total_cost_expected_gbp)),
    upliftedCases: headline.filter(isUplift).length,
    tiers: [...byTier.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([budgetGbp, tierPlans]) => {
        const tierTotal = tierPlans.reduce((sum, plan) => addRange(sum, planRange(plan)), emptyRange());
        return {
          budgetGbp,
          cases: tierPlans.length,
          total: tierTotal,
          average: meanRange(tierTotal, tierPlans.length),
          upliftedCases: tierPlans.filter(isUplift).length,
        };
      }),
  };
}

export type Improvement = {
  label: string;
  cases: number;
  total: CostRange;
  /** What this work typically comes to on one property. */
  average: CostRange;
};

/**
 * The works that come up most often across planned cases, with what they typically cost.
 *
 * Counted once per case: a line repeated across a case's tiers is the same piece of work,
 * and `planIds` should therefore be the headline plans only.
 */
export function buildTopImprovements(
  lines: PlanLineRow[],
  planIds: Set<string>,
  limit = 8,
): Improvement[] {
  const totals = new Map<string, { cases: number; total: CostRange }>();
  for (const line of lines) {
    if (!planIds.has(line.plan_id)) continue;
    const label = line.label.trim() || "Unnamed work item";
    const entry = totals.get(label) ?? { cases: 0, total: emptyRange() };
    entry.cases += 1;
    entry.total = addRange(entry.total, {
      lowGbp: line.cost_low_gbp,
      expectedGbp: line.cost_expected_gbp,
      highGbp: line.cost_high_gbp,
    });
    totals.set(label, entry);
  }
  return [...totals.entries()]
    .map(([label, entry]) => ({
      label,
      cases: entry.cases,
      total: entry.total,
      average: meanRange(entry.total, entry.cases)!,
    }))
    .sort(
      (a, b) =>
        b.cases - a.cases ||
        b.total.expectedGbp - a.total.expectedGbp ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit);
}

export type MemberActivity = MemberWorkload & {
  /** Cases this member finalised inside the reporting window. */
  completedInPeriod: number;
  /** Days from creation to completion, over this member's finalised cases. */
  medianCompletionDays: number | null;
  /** Most recent update on any of their cases, for spotting a quiet account. */
  lastActivity: string | null;
};

/**
 * Per-member figures for the reporting window, busiest first.
 *
 * The rows passed in are already limited to the window, so "completed in period" is simply
 * the finalised ones — no second date filter that could disagree with the charts.
 */
export function buildMemberActivity(
  rows: AssessmentAnalyticsRow[],
  members: WorkloadMember[],
): MemberActivity[] {
  const byUser = new Map<string, AssessmentAnalyticsRow[]>();
  for (const row of rows) {
    const key = row.user_id ?? "";
    byUser.set(key, [...(byUser.get(key) ?? []), row]);
  }
  const known = new Set(members.map((member) => member.user_id ?? ""));

  return buildMemberWorkload(rows, members).map((entry) => {
    const owned =
      entry.key === "unattributed"
        ? rows.filter((row) => !known.has(row.user_id ?? ""))
        : (byUser.get(entry.key) ?? []);
    const completionDays = owned
      .filter((row) => row.created_at && row.completed_at)
      .map(
        (row) =>
          (new Date(row.completed_at!).valueOf() - new Date(row.created_at!).valueOf()) /
          86_400_000,
      )
      .filter((days) => days >= 0);
    const updates = owned
      .map((row) => row.updated_at ?? row.created_at)
      .filter((value): value is string => Boolean(value))
      .sort();
    return {
      ...entry,
      completedInPeriod: owned.filter(
        (row) => normalizeAssessmentStatus(row.status) === "complete",
      ).length,
      medianCompletionDays: median(completionDays),
      lastActivity: updates.length ? updates[updates.length - 1] : null,
    };
  });
}

/**
 * The member who finalised the most cases in the window.
 *
 * Finalised, not started: the point of the card is completed work. Ties go to the faster
 * median turnaround, and a member with nothing finalised is never named.
 */
export function pickTopMember(activity: MemberActivity[]): MemberActivity | null {
  const eligible = activity.filter(
    (member) => member.key !== "unattributed" && member.completedInPeriod > 0,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((best, member) => {
    if (member.completedInPeriod !== best.completedInPeriod) {
      return member.completedInPeriod > best.completedInPeriod ? member : best;
    }
    const bestDays = best.medianCompletionDays ?? Number.MAX_SAFE_INTEGER;
    const memberDays = member.medianCompletionDays ?? Number.MAX_SAFE_INTEGER;
    return memberDays < bestDays ? member : best;
  });
}

/** "£12,400" — whole pounds, which is all these estimates justify. */
export function formatGbp(value: number | null): string {
  if (value == null) return "—";
  return `£${Math.round(value).toLocaleString("en-GB")}`;
}

/**
 * "£10,200 – £15,300" — the low and high ends only.
 *
 * The expected value is deliberately absent: it is shown separately as the one exact
 * number, and repeating it inside the range reads as a third estimate of equal standing.
 */
export function formatGbpRange(range: CostRange | null): string {
  if (!range) return "—";
  if (range.lowGbp === range.highGbp) return formatGbp(range.expectedGbp);
  return `${formatGbp(range.lowGbp)} – ${formatGbp(range.highGbp)}`;
}
