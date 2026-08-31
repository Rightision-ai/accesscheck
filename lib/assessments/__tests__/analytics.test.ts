import { describe, expect, it } from "vitest";
import {
  buildAssessmentSummary,
  buildBandDistribution,
  median,
  type AssessmentAnalyticsRow,
} from "@/lib/assessments/analytics";

const row = (
  id: number,
  overall_grade: string | null,
): AssessmentAnalyticsRow => ({
  id,
  created_at: "2026-08-01",
  updated_at: null,
  completed_at: null,
  status: "complete",
  assessment_readiness: "ready",
  overall_grade,
});

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
    expect(summary.draft + summary.review + summary.complete).toBe(summary.total);
  });

  it("counts legacy in_progress rows as drafts", () => {
    const summary = buildAssessmentSummary([
      { id: 1, created_at: "2026-08-01", updated_at: null, completed_at: null, status: "in_progress" as never, assessment_readiness: "partial", overall_grade: null },
    ], new Date("2026-08-28"));
    expect(summary.draft).toBe(1);
    expect(summary.draft + summary.review + summary.complete).toBe(summary.total);
  });
});

describe("band distribution", () => {
  it("counts bands and returns them in band order, omitting empty ones", () => {
    const slices = buildBandDistribution([
      row(1, "F"),
      row(2, "A"),
      row(3, "F"),
      row(4, "E+"),
    ]);
    expect(slices.map((s) => s.band)).toEqual(["A", "E+", "F"]);
    expect(slices.map((s) => s.count)).toEqual([1, 1, 2]);
  });

  it("carries each band's own colour", () => {
    const [a] = buildBandDistribution([row(1, "A")]);
    expect(a.colour).toBe("#059669");
    expect(a.label).toBeTruthy();
  });

  it("keeps ungraded rows separate from band G", () => {
    const slices = buildBandDistribution([
      row(1, "G"),
      row(2, null),
      row(3, "not a band"),
    ]);
    expect(slices.find((s) => s.band === "G")?.count).toBe(1);
    const unbanded = slices.find((s) => s.band === null);
    expect(unbanded?.count).toBe(2);
    // The ungraded bucket always sorts last, after every real band.
    expect(slices[slices.length - 1].band).toBeNull();
  });

  it("normalises grade casing and whitespace", () => {
    const slices = buildBandDistribution([row(1, " e+ "), row(2, "a")]);
    expect(slices.map((s) => s.band)).toEqual(["A", "E+"]);
  });

  it("returns nothing for no rows", () => {
    expect(buildBandDistribution([])).toEqual([]);
  });

  it("accounts for every row exactly once", () => {
    const rows = [row(1, "A"), row(2, "C"), row(3, null), row(4, "C")];
    const slices = buildBandDistribution(rows);
    expect(slices.reduce((sum, s) => sum + s.count, 0)).toBe(rows.length);
  });
});
