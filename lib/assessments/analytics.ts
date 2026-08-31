import { normalizeAssessmentStatus } from "@/lib/assessments/status";
import { LAHR_BANDS, LAHR_BAND_BY_ID, type LahrBandId } from "@/lib/accessibility/lahr/types";
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

export type BandSlice = {
  /** A LAHR band id, or null for rows that have not been banded yet. */
  band: LahrBandId | null;
  label: string;
  colour: string;
  count: number;
};

/** Light slate, distinct from band G's slate, for rows with no grade recorded. */
const UNBANDED_COLOUR = "#cbd5e1";

/**
 * Counts assessments per Accessible Housing Rules band, in band order (A → G), keeping
 * only the bands that actually occur. Rows whose `overall_grade` is missing or
 * unrecognised are reported separately rather than folded into G — G is a real band
 * meaning "cannot be determined", which is not the same as "not assessed yet".
 */
export function buildBandDistribution(rows: AssessmentAnalyticsRow[]): BandSlice[] {
  const counts = new Map<LahrBandId | null, number>();
  for (const row of rows) {
    const grade = String(row.overall_grade ?? "").trim().toUpperCase();
    const band = (grade in LAHR_BAND_BY_ID ? grade : null) as LahrBandId | null;
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  const slices: BandSlice[] = LAHR_BANDS.slice()
    .sort((a, b) => a.order - b.order)
    .filter((definition) => (counts.get(definition.id) ?? 0) > 0)
    .map((definition) => ({
      band: definition.id,
      label: definition.label,
      colour: definition.color,
      count: counts.get(definition.id) ?? 0,
    }));

  const unbanded = counts.get(null) ?? 0;
  if (unbanded > 0) {
    slices.push({
      band: null,
      label: "Not yet banded",
      colour: UNBANDED_COLOUR,
      count: unbanded,
    });
  }
  return slices;
}

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
