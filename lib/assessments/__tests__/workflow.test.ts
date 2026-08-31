import { describe, expect, it } from "vitest";
import { canTransitionAssessment, validateAssessment } from "@/lib/assessments/workflow";

describe("assessment workflow", () => {
  it("requires all shared sections before review", () => {
    const validation = validateAssessment({
      street: "1 High Street",
      postcode: "E1 1AA",
      propertyType: "Flat",
      inspectorName: "Officer",
      inspectionDate: "2026-08-28",
      overallGrade: "B",
      evidenceCount: 1,
    });
    expect(validation.completionPercent).toBe(100);
    expect(validation.canSubmitForReview).toBe(true);
  });

  it("only submits a fully complete draft for review", () => {
    expect(canTransitionAssessment("draft", "review", ["author"], 75)).toBe(false);
    expect(canTransitionAssessment("draft", "review", ["author"], 100)).toBe(true);
    expect(canTransitionAssessment("draft", "review", ["admin"], 100)).toBe(true);
  });

  it("lets an author or admin finalise, but nobody else", () => {
    expect(canTransitionAssessment("review", "complete", ["author"], 100)).toBe(true);
    expect(canTransitionAssessment("review", "complete", ["admin"], 100)).toBe(true);
    expect(canTransitionAssessment("review", "complete", ["reviewer"], 100)).toBe(false);
    expect(canTransitionAssessment("review", "complete", [], 100)).toBe(false);
  });

  it("requires a reason to return or reopen", () => {
    expect(canTransitionAssessment("review", "draft", ["author"], 100)).toBe(false);
    expect(canTransitionAssessment("review", "draft", ["author"], 100, "Bathroom photos unclear")).toBe(true);
    expect(canTransitionAssessment("complete", "draft", ["admin"], 100)).toBe(false);
    expect(canTransitionAssessment("complete", "draft", ["admin"], 100, "New evidence")).toBe(true);
  });

  it("refuses to skip the review stage", () => {
    expect(canTransitionAssessment("draft", "complete", ["admin"], 100)).toBe(false);
    expect(canTransitionAssessment("complete", "review", ["admin"], 100, "Reopen")).toBe(false);
  });
});
