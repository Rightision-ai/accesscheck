import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_STATUSES,
  assessmentStatusMeta,
  normalizeAssessmentStatus,
} from "@/lib/assessments/status";

describe("assessment status normalisation", () => {
  it("folds the retired in_progress status into draft", () => {
    expect(normalizeAssessmentStatus("in_progress")).toBe("draft");
    expect(normalizeAssessmentStatus("In Progress")).toBe("draft");
    expect(normalizeAssessmentStatus("Pending")).toBe("draft");
    expect(normalizeAssessmentStatus("active")).toBe("draft");
  });

  it("accepts legacy review and complete spellings", () => {
    expect(normalizeAssessmentStatus("Under Review")).toBe("review");
    expect(normalizeAssessmentStatus("pending review")).toBe("review");
    expect(normalizeAssessmentStatus("Completed")).toBe("complete");
    expect(normalizeAssessmentStatus("finalised")).toBe("complete");
    expect(normalizeAssessmentStatus("finalized")).toBe("complete");
  });

  it("falls back to draft for missing or unknown values", () => {
    expect(normalizeAssessmentStatus(null)).toBe("draft");
    expect(normalizeAssessmentStatus(undefined)).toBe("draft");
    expect(normalizeAssessmentStatus("")).toBe("draft");
    expect(normalizeAssessmentStatus("something else")).toBe("draft");
  });

  it("round-trips every supported status", () => {
    for (const status of ASSESSMENT_STATUSES) {
      expect(normalizeAssessmentStatus(status)).toBe(status);
      expect(assessmentStatusMeta(status).label).toBeTruthy();
    }
  });
});
