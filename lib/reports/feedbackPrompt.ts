import { formatGbp, formatGbpRange, type CostSummary, type Improvement, type MemberActivity } from "./analytics";

/**
 * The brief the engine answers when a user asks for feedback on their report.
 *
 * The figures are pasted in already formatted, so the model is reading exactly what the
 * user is looking at on screen — it cannot quote a number the page does not show. It is
 * asked for judgement, not arithmetic: restating totals back to someone who can see them
 * is the failure mode this prompt is written against.
 */

export type ReportFacts = {
  organisationName: string;
  range: { from: string; to: string };
  summary: {
    total: number;
    complete: number;
    review: number;
    draft: number;
    medianCompletionDays: number | null;
    readiness: { ready: number; partial: number; incomplete: number };
  };
  bands: Array<{ label: string; count: number }>;
  cost: CostSummary;
  improvements: Improvement[];
  activity: MemberActivity[];
};

export type ReportFeedback = {
  headline: string;
  observations: string[];
  recommendations: string[];
  watchOuts: string[];
};

export const REPORT_FEEDBACK_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    observations: { type: "ARRAY", items: { type: "STRING" } },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
    watchOuts: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["headline", "observations", "recommendations", "watchOuts"],
} as const;

export function buildReportFeedbackPrompt(facts: ReportFacts): string {
  const { summary, cost, activity } = facts;
  const lines: string[] = [
    "You are an analyst advising a UK local-authority housing team on their accessibility",
    "assessment programme. You are given the figures from their report for one period.",
    "",
    `Organisation: ${facts.organisationName}`,
    `Period: ${facts.range.from} to ${facts.range.to}`,
    "",
    "ASSESSMENT VOLUME",
    `- ${summary.total} assessments created, ${summary.complete} finalised, ${summary.review} in review, ${summary.draft} draft.`,
    `- Median time from creation to finalisation: ${summary.medianCompletionDays == null ? "not enough finalised cases to say" : `${Math.round(summary.medianCompletionDays)} days`}.`,
    `- Evidence quality: ${summary.readiness.ready} ready, ${summary.readiness.partial} partial, ${summary.readiness.incomplete} incomplete.`,
    "",
    "ACCESSIBILITY BANDS (Accessible Housing Rules; A is most accessible, G means it could not be determined)",
    ...facts.bands.map((band) => `- ${band.label}: ${band.count}`),
    "",
    "ADAPTATION PLAN COSTS (every cost is a range; the expected value is the central estimate)",
    cost.casesPlanned === 0
      ? "- No adaptation plans were generated for cases in this period."
      : [
          `- ${cost.casesPlanned} cases planned. Total ${formatGbpRange(cost.total)}, expected ${formatGbp(cost.total.expectedGbp)}.`,
          `- Average per case ${formatGbpRange(cost.average)}, expected ${formatGbp(cost.average?.expectedGbp ?? null)}.`,
          `- Median expected cost per case ${formatGbp(cost.medianExpectedGbp)}.`,
          `- ${cost.upliftedCases} of ${cost.casesPlanned} planned cases gain at least one band.`,
          ...cost.tiers.map(
            (tier) =>
              `- £${tier.budgetGbp.toLocaleString()} tier: ${tier.cases} plans, average ${formatGbpRange(tier.average)} (expected ${formatGbp(tier.average?.expectedGbp ?? null)}), ${tier.upliftedCases} gaining a band.`,
          ),
        ].join("\n"),
    "",
    "MOST-PLANNED WORKS",
    facts.improvements.length === 0
      ? "- None recorded."
      : facts.improvements
          .map(
            (work) =>
              `- ${work.label}: in ${work.cases} plans, typically ${formatGbpRange(work.average)} (expected ${formatGbp(work.average.expectedGbp)}).`,
          )
          .join("\n"),
    "",
    "TEAM",
    activity.length === 0
      ? "- No per-member figures available."
      : activity
          .map(
            (member) =>
              `- ${member.name}: ${member.total} cases (${member.complete} finalised, ${member.review} in review, ${member.draft} draft), median ${member.medianCompletionDays == null ? "n/a" : `${Math.round(member.medianCompletionDays)} days`}.`,
          )
          .join("\n"),
    "",
    "Write feedback for the manager reading this report. Requirements:",
    "- headline: one sentence, under 25 words, saying what the period actually shows.",
    "- observations: 3 to 5 items. Each must interpret the figures — a pattern, a comparison,",
    "  a bottleneck — not restate a number the reader can already see. Where you cite a figure,",
    "  cite it exactly as given above.",
    "- recommendations: 2 to 4 concrete next actions this team can take, each naming what to do",
    "  and why the figures justify it.",
    "- watchOuts: 1 to 3 caveats about reading these numbers — small samples, cost estimates being",
    "  ranges rather than quotes, unfinalised cases whose band can still change.",
    "Be specific and plain. No preamble, no markdown, no bullet characters — return JSON only.",
    "Never claim a cost is a quote: these are indicative estimates priced from a rate card.",
  ];
  return lines.join("\n");
}
