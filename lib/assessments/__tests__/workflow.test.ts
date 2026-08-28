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

  it("only lets reviewers complete a case", () => {
    expect(canTransitionAssessment("review", "complete", ["author"], 100)).toBe(false);
    expect(canTransitionAssessment("review", "complete", ["author", "reviewer"], 100)).toBe(true);
  });

  it("requires a reason to return or reopen", () => {
    expect(canTransitionAssessment("complete", "in_progress", ["reviewer"], 100)).toBe(false);
    expect(canTransitionAssessment("complete", "in_progress", ["reviewer"], 100, "New evidence")).toBe(true);
  });
});
