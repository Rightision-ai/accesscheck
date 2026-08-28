import { describe, expect, it } from "vitest";
import { buildAssessmentSummary, median } from "@/lib/assessments/analytics";

describe("assessment analytics", () => {
  it("calculates medians for odd and even sets", () => {
    expect(median([1, 9, 3])).toBe(3);
    expect(median([1, 3, 5, 9])).toBe(4);
  });

  it("keeps lifecycle counts mutually exclusive", () => {
    const summary = buildAssessmentSummary([
      { id: 1, created_at: "2026-08-01", updated_at: null, completed_at: null, status: "draft", assessment_readiness: "incomplete", overall_grade: null },
      { id: 2, created_at: "2026-08-01", updated_at: null, completed_at: null, status: "review", assessment_readiness: "ready", overall_grade: "B" },
    ], new Date("2026-08-28"));
    expect(summary.open).toBe(2);
    expect(summary.draft + summary.inProgress + summary.review + summary.complete).toBe(summary.total);
  });
});
