import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_STATUSES,
  assessmentStatusMeta,
  isAssessmentLocked,
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

describe("isAssessmentLocked", () => {
  it("treats a complete status as locked", () => {
    expect(isAssessmentLocked({ status: "complete" })).toBe(true);
    expect(isAssessmentLocked({ status: "finalised" })).toBe(true);
  });

  it("treats the report's own lock flag as locked", () => {
    expect(isAssessmentLocked({ status: "draft", isLocked: true })).toBe(true);
  });

  it("closes the drift between the two flags", () => {
    // The bug this exists for: a case reaches `complete` via the status route without passing
    // through the report's "Finalise & Save", so raw_ai_data.isLocked is never written. Reading
    // isLocked alone — as ReportView did — rendered that case fully editable.
    expect(isAssessmentLocked({ status: "complete", isLocked: undefined })).toBe(true);
    expect(isAssessmentLocked({ status: "complete", isLocked: false })).toBe(true);
  });

  it("leaves an unfinished case unlocked", () => {
    expect(isAssessmentLocked({ status: "draft" })).toBe(false);
    expect(isAssessmentLocked({ status: "review" })).toBe(false);
    expect(isAssessmentLocked({})).toBe(false);
    expect(isAssessmentLocked({ status: null, isLocked: null })).toBe(false);
  });
});
