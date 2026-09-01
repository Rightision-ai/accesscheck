import { describe, expect, it } from "vitest";
import {
  buildCostSummary,
  buildMemberActivity,
  buildTopImprovements,
  formatGbp,
  isUplift,
  pickHeadlinePlans,
  pickTopMember,
  type PlanLineRow,
  type PlanRow,
} from "@/lib/reports/analytics";
import type { AssessmentAnalyticsRow } from "@/lib/assessments/analytics";

const plan = (
  id: string,
  survey_id: number,
  budget_gbp: number,
  expected: number,
  bands: [string, string] = ["D", "C"],
): PlanRow => ({
  id,
  survey_id,
  budget_gbp,
  total_cost_expected_gbp: expected,
  total_cost_low_gbp: Math.round(expected * 0.8),
  total_cost_high_gbp: Math.round(expected * 1.2),
  current_band: bands[0],
  potential_band: bands[1],
});

const survey = (
  id: number,
  user_id: string | null,
  status: AssessmentAnalyticsRow["status"],
  created: string,
  completed: string | null = null,
): AssessmentAnalyticsRow => ({
  id,
  user_id,
  created_at: created,
  updated_at: completed ?? created,
  completed_at: completed,
  status,
  assessment_readiness: "ready",
  overall_grade: "C",
});

describe("adaptation plan costs", () => {
  it("counts each case once, at its fullest tier", () => {
    const plans = [
      plan("a", 1, 15000, 12000),
      plan("b", 1, 30000, 26000),
      plan("c", 2, 15000, 9000),
    ];
    expect(pickHeadlinePlans(plans).map((row) => row.id).sort()).toEqual(["b", "c"]);
    const summary = buildCostSummary(plans);
    expect(summary.casesPlanned).toBe(2);
    expect(summary.totalExpectedGbp).toBe(35000);
    expect(summary.averageGbp).toBe(17500);
  });

  it("breaks the same plans down by funding tier", () => {
    const summary = buildCostSummary([
      plan("a", 1, 15000, 12000),
      plan("b", 2, 15000, 14000),
      plan("c", 1, 30000, 26000),
    ]);
    expect(summary.tiers.map((tier) => tier.budgetGbp)).toEqual([15000, 30000]);
    expect(summary.tiers[0]).toMatchObject({ cases: 2, averageGbp: 13000 });
    expect(summary.tiers[1]).toMatchObject({ cases: 1, averageGbp: 26000 });
  });

  it("counts an uplift only when the band actually improves", () => {
    expect(isUplift({ current_band: "D", potential_band: "B" })).toBe(true);
    expect(isUplift({ current_band: "C", potential_band: "C" })).toBe(false);
    // A worse potential band is not an uplift, however the rows were written.
    expect(isUplift({ current_band: "B", potential_band: "D" })).toBe(false);
  });

  it("reports nothing rather than zero for an empty period", () => {
    const summary = buildCostSummary([]);
    expect(summary).toMatchObject({ casesPlanned: 0, totalExpectedGbp: 0, averageGbp: null, medianGbp: null });
    expect(summary.tiers).toEqual([]);
  });
});

describe("top improvements", () => {
  const line = (plan_id: string, label: string, cost: number): PlanLineRow => ({
    plan_id,
    label,
    cost_expected_gbp: cost,
    difficulty: "moderate",
  });

  it("ranks works by how many plans they appear in", () => {
    const improvements = buildTopImprovements(
      [
        line("a", "Level access shower", 6000),
        line("b", "Level access shower", 7000),
        line("b", "Threshold ramp", 900),
      ],
      new Set(["a", "b"]),
    );
    expect(improvements[0]).toMatchObject({ label: "Level access shower", cases: 2, totalGbp: 13000, averageGbp: 6500 });
    expect(improvements[1].label).toBe("Threshold ramp");
  });

  it("ignores lines from plans outside the headline set", () => {
    const improvements = buildTopImprovements(
      [line("a", "Stairlift", 4000), line("other-tier", "Stairlift", 4000)],
      new Set(["a"]),
    );
    expect(improvements).toHaveLength(1);
    expect(improvements[0].cases).toBe(1);
  });

  it("keeps only the requested number of works", () => {
    const lines = ["a", "b", "c", "d"].map((label, index) => line("p", label, index * 100 + 100));
    expect(buildTopImprovements(lines, new Set(["p"]), 2)).toHaveLength(2);
  });
});

describe("member activity", () => {
  const members = [
    { id: "m1", user_id: "u1", first_name: "Ada", last_name: "Lovelace", avatar_url: null },
    { id: "m2", user_id: "u2", first_name: "Grace", last_name: "Hopper", avatar_url: null },
  ];

  it("adds turnaround and last activity to each member's counts", () => {
    const activity = buildMemberActivity(
      [
        survey(1, "u1", "complete", "2026-08-01", "2026-08-05"),
        survey(2, "u1", "complete", "2026-08-01", "2026-08-11"),
        survey(3, "u1", "draft", "2026-08-20"),
      ],
      members,
    );
    const ada = activity.find((entry) => entry.key === "u1")!;
    expect(ada).toMatchObject({ total: 3, complete: 2, draft: 1, completedInPeriod: 2 });
    expect(ada.medianCompletionDays).toBe(7);
    expect(ada.lastActivity).toBe("2026-08-20");
  });

  it("names the member who finalised the most, not the busiest", () => {
    const activity = buildMemberActivity(
      [
        survey(1, "u1", "draft", "2026-08-01"),
        survey(2, "u1", "draft", "2026-08-02"),
        survey(3, "u1", "draft", "2026-08-03"),
        survey(4, "u2", "complete", "2026-08-01", "2026-08-03"),
      ],
      members,
    );
    expect(pickTopMember(activity)?.name).toBe("Grace Hopper");
  });

  it("names nobody when nothing was finalised", () => {
    const activity = buildMemberActivity([survey(1, "u1", "review", "2026-08-01")], members);
    expect(pickTopMember(activity)).toBeNull();
  });

  it("breaks a tie on the faster median turnaround", () => {
    const activity = buildMemberActivity(
      [
        survey(1, "u1", "complete", "2026-08-01", "2026-08-10"),
        survey(2, "u2", "complete", "2026-08-01", "2026-08-03"),
      ],
      members,
    );
    expect(pickTopMember(activity)?.name).toBe("Grace Hopper");
  });
});

describe("formatGbp", () => {
  it("renders whole pounds and an em dash for nothing", () => {
    expect(formatGbp(12400)).toBe("£12,400");
    expect(formatGbp(null)).toBe("—");
  });
});
