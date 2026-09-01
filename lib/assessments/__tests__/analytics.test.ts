import { describe, expect, it } from "vitest";
import {
  buildAssessmentSummary,
  buildBandDistribution,
  buildMemberWorkload,
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

  it("reports unfinalised cases as under review rather than by band", () => {
    const slices = buildBandDistribution([
      row(1, "A"),
      { ...row(2, "A"), status: "review" },
      { ...row(3, "B"), status: "draft" },
      { ...row(4, null), status: "review" },
    ]);
    // The finalised A is the only banded row; the other three are all still in play.
    expect(slices.find((s) => s.band === "A")?.count).toBe(1);
    expect(slices.find((s) => s.band === "B")).toBeUndefined();
    const review = slices.find((s) => s.key === "under-review");
    expect(review?.count).toBe(3);
    expect(review?.label).toBe("Under review");
    // "Not yet banded" stays reserved for finalised cases with no usable grade.
    expect(slices.find((s) => s.key === "unbanded")).toBeUndefined();
  });

  it("keeps under review and not yet banded apart", () => {
    const slices = buildBandDistribution([
      { ...row(1, null), status: "draft" },
      row(2, null),
    ]);
    expect(slices.find((s) => s.key === "under-review")?.count).toBe(1);
    expect(slices.find((s) => s.key === "unbanded")?.count).toBe(1);
  });
});

describe("member workload", () => {
  const authored = (id: number, user_id: string | null, status: AssessmentAnalyticsRow["status"]) => ({
    ...row(id, "A"),
    user_id,
    status,
  });
  const members = [
    { id: "m1", user_id: "u1", first_name: "Ada", last_name: "Lovelace", avatar_url: null },
    { id: "m2", user_id: "u2", first_name: "Grace", last_name: "Hopper", avatar_url: "https://example.test/g.png" },
  ];

  it("counts each member's cases by status, busiest first", () => {
    const workload = buildMemberWorkload(
      [
        authored(1, "u2", "complete"),
        authored(2, "u2", "review"),
        authored(3, "u2", "draft"),
        authored(4, "u1", "complete"),
      ],
      members,
    );
    expect(workload.map((entry) => entry.name)).toEqual(["Grace Hopper", "Ada Lovelace"]);
    expect(workload[0]).toMatchObject({ complete: 1, review: 1, draft: 1, total: 3 });
    expect(workload[1]).toMatchObject({ complete: 1, review: 0, draft: 0, total: 1 });
  });

  it("lists members with nothing on their plate", () => {
    const workload = buildMemberWorkload([authored(1, "u1", "draft")], members);
    expect(workload.find((entry) => entry.key === "u2")?.total).toBe(0);
  });

  it("gathers cases from unknown authors so the rows still add up", () => {
    const rows = [authored(1, "u1", "complete"), authored(2, "gone", "review"), authored(3, null, "draft")];
    const workload = buildMemberWorkload(rows, members);
    const orphans = workload.find((entry) => entry.key === "unattributed");
    expect(orphans?.total).toBe(2);
    // Nothing to link to, so the card leaves the row inert.
    expect(orphans?.memberId).toBeNull();
    expect(workload.reduce((sum, entry) => sum + entry.total, 0)).toBe(rows.length);
  });

  it("normalises legacy statuses into the three buckets", () => {
    const [ada] = buildMemberWorkload([authored(1, "u1", "in_progress" as never)], [members[0]]);
    expect(ada).toMatchObject({ draft: 1, total: 1 });
  });
});
