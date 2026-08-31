import { normalizeAssessmentStatus } from "@/lib/assessments/status";
import type { AssessmentReadiness, AssessmentStatus } from "@/types/accesscheck";

export type AssessmentAnalyticsRow = {
  id: number;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  status: AssessmentStatus;
  assessment_readiness: AssessmentReadiness;
  overall_grade: string | null;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildAssessmentSummary(rows: AssessmentAnalyticsRow[], now = new Date()) {
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);
  const completionDays = rows
    .filter((row) => row.created_at && row.completed_at)
    .map((row) => (new Date(row.completed_at!).valueOf() - new Date(row.created_at!).valueOf()) / 86_400_000)
    .filter((days) => days >= 0);
  // Normalise so legacy values (in_progress, "Completed", …) still land in a bucket.
  const statusOf = (row: AssessmentAnalyticsRow) => normalizeAssessmentStatus(row.status);
  const counts = (status: AssessmentStatus) => rows.filter((row) => statusOf(row) === status).length;

  return {
    total: rows.length,
    open: rows.filter((row) => statusOf(row) !== "complete").length,
    draft: counts("draft"),
    review: counts("review"),
    complete: counts("complete"),
    completedInPeriod: rows.filter(
      (row) => row.completed_at && new Date(row.completed_at) >= periodStart,
    ).length,
    medianCompletionDays: median(completionDays),
    readiness: {
      ready: rows.filter((row) => row.assessment_readiness === "ready").length,
      partial: rows.filter((row) => row.assessment_readiness === "partial").length,
      incomplete: rows.filter((row) => row.assessment_readiness === "incomplete").length,
    },
  };
}

export function buildWeeklyTrend(rows: AssessmentAnalyticsRow[], now = new Date(), weeks = 12) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (weeks - 1) * 7 - start.getDay());
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const inWeek = (value: string | null) => {
      if (!value) return false;
      const date = new Date(value);
      return date >= weekStart && date < weekEnd;
    };
    return {
      week: weekStart.toISOString().slice(0, 10),
      started: rows.filter((row) => inWeek(row.created_at)).length,
      completed: rows.filter((row) => inWeek(row.completed_at)).length,
    };
  });
}
