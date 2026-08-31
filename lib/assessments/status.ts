import type { AssessmentStatus } from "@/types/accesscheck";

export const ASSESSMENT_STATUSES: AssessmentStatus[] = [
  "draft",
  "review",
  "complete",
];

export type AssessmentStatusMeta = {
  label: string;
  /** Badge container: background + text + border. */
  badge: string;
  /** Solid swatch for dots and accent strips. */
  dot: string;
  /** Hex pair for the inline styles CaseDetailView renders with. */
  colour: string;
  background: string;
};

export const ASSESSMENT_STATUS_META: Record<
  AssessmentStatus,
  AssessmentStatusMeta
> = {
  draft: {
    label: "Draft",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    colour: "#475569",
    background: "#f8fafc",
  },
  review: {
    label: "In Review",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-500",
    colour: "#d97706",
    background: "#fffbeb",
  },
  complete: {
    label: "Finalised",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dot: "bg-emerald-500",
    colour: "#059669",
    background: "#ecfdf5",
  },
};

/**
 * Single normaliser for every status value entering the app — DB rows, wizard payloads
 * and legacy free-text. `in_progress` was folded into `draft` when the workflow moved to
 * three statuses, so historical values must keep resolving rather than falling over.
 */
export function normalizeAssessmentStatus(value: unknown): AssessmentStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
  if (
    raw === "review" ||
    raw === "under_review" ||
    raw === "pending_review" ||
    raw === "in_review"
  ) {
    return "review";
  }
  // "finalized" is accepted only because older rows were written with it — everything the
  // app produces uses British spelling.
  if (
    raw === "complete" ||
    raw === "completed" ||
    raw === "finalised" ||
    raw === "finalized"
  ) {
    return "complete";
  }
  return "draft";
}

export function assessmentStatusMeta(value: unknown): AssessmentStatusMeta {
  return ASSESSMENT_STATUS_META[normalizeAssessmentStatus(value)];
}
