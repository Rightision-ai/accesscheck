import type { AssessmentReadiness, AssessmentStatus } from "@/types/accesscheck";

export type AssessmentSection = {
  key: "property" | "inspection" | "analysis" | "evidence";
  label: string;
  complete: boolean;
};

export type AssessmentWorkflowInput = {
  street?: string | null;
  postcode?: string | null;
  propertyType?: string | null;
  inspectorName?: string | null;
  inspectionDate?: string | null;
  overallGrade?: string | null;
  evidenceCount: number;
};

export type AssessmentValidation = {
  sections: AssessmentSection[];
  missingSections: string[];
  completionPercent: number;
  readiness: AssessmentReadiness;
  canSubmitForReview: boolean;
};

export function validateAssessment(input: AssessmentWorkflowInput): AssessmentValidation {
  const sections: AssessmentSection[] = [
    {
      key: "property",
      label: "Property details",
      complete: Boolean(input.street?.trim() && input.postcode?.trim() && input.propertyType?.trim()),
    },
    {
      key: "inspection",
      label: "Inspection details",
      complete: Boolean(input.inspectorName?.trim() && input.inspectionDate),
    },
    {
      key: "analysis",
      label: "Accessibility analysis",
      complete: Boolean(input.overallGrade?.trim()),
    },
    {
      key: "evidence",
      label: "Supporting evidence",
      complete: input.evidenceCount > 0,
    },
  ];
  const completed = sections.filter((section) => section.complete).length;
  const completionPercent = Math.round((completed / sections.length) * 100);
  const readiness: AssessmentReadiness =
    completionPercent === 100 ? "ready" : completionPercent === 0 ? "incomplete" : "partial";
  return {
    sections,
    missingSections: sections.filter((section) => !section.complete).map((section) => section.label),
    completionPercent,
    readiness,
    canSubmitForReview: completionPercent === 100,
  };
}

export function canTransitionAssessment(
  from: AssessmentStatus,
  to: AssessmentStatus,
  permissions: readonly string[],
  completionPercent: number,
  reason?: string,
): boolean {
  const author = permissions.includes("author");
  const reviewer = permissions.includes("reviewer");
  if (from === "draft" && to === "in_progress") return author;
  if (from === "in_progress" && to === "review") return author && completionPercent === 100;
  if (from === "review" && to === "in_progress") return (author || reviewer) && Boolean(reason?.trim());
  if (from === "review" && to === "complete") return reviewer;
  if (from === "complete" && to === "in_progress") return reviewer && Boolean(reason?.trim());
  return false;
}
