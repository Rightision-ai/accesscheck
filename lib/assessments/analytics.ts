import { ASSESSMENT_STATUS_META, normalizeAssessmentStatus } from "@/lib/assessments/status";
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
  /** The member who created the case. Only selected where per-author figures are needed. */
  user_id?: string | null;
};

export type BandSlice = {
  /** Stable identity for keys: the band id, or the name of a non-band bucket. */
  key: string;
  /** A LAHR band id, or null for the two non-band buckets. */
  band: LahrBandId | null;
  label: string;
  colour: string;
  count: number;
};

/** Light slate, distinct from band G's slate, for rows with no grade recorded. */
const UNBANDED_COLOUR = "#cbd5e1";

/**
 * Counts assessments per Accessible Housing Rules band, in band order (A → G), keeping
 * only the bands that actually occur.
 *
 * Two buckets sit outside the bands, and they mean different things:
 *  - "Under review" — the case is not finalised, so whatever grade it carries can still
 *    change. Counting it as a band would report unsettled work as assessed stock.
 *  - "Not yet banded" — the case is finalised but its `overall_grade` is missing or
 *    unrecognised. This is not band G: G is a real band meaning "cannot be determined".
 */
export function buildBandDistribution(rows: AssessmentAnalyticsRow[]): BandSlice[] {
  const counts = new Map<LahrBandId | null, number>();
  let underReview = 0;
  for (const row of rows) {
    if (normalizeAssessmentStatus(row.status) !== "complete") {
      underReview += 1;
      continue;
    }
    const grade = String(row.overall_grade ?? "").trim().toUpperCase();
    const band = (grade in LAHR_BAND_BY_ID ? grade : null) as LahrBandId | null;
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  const slices: BandSlice[] = LAHR_BANDS.slice()
    .sort((a, b) => a.order - b.order)
    .filter((definition) => (counts.get(definition.id) ?? 0) > 0)
    .map((definition) => ({
      key: definition.id,
      band: definition.id,
      label: definition.label,
      colour: definition.color,
      count: counts.get(definition.id) ?? 0,
    }));

  if (underReview > 0) {
    slices.push({
      key: "under-review",
      band: null,
      label: "Under review",
      // The amber the "In Review" badge uses, so the two read as the same state.
      colour: ASSESSMENT_STATUS_META.review.colour,
      count: underReview,
    });
  }

  const unbanded = counts.get(null) ?? 0;
  if (unbanded > 0) {
    slices.push({
      key: "unbanded",
      band: null,
      label: "Not yet banded",
      colour: UNBANDED_COLOUR,
      count: unbanded,
    });
  }
  return slices;
}

export type WorkloadMember = {
  /** The `organisation_members` row id, which the member detail page is keyed by. */
  id: string;
  user_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

export type MemberWorkload = {
  /** The member's auth user id, or "unattributed" for the catch-all row. */
  key: string;
  /** Membership id to link to, or null for the catch-all row, which has no member page. */
  memberId: string | null;
  name: string;
  avatarUrl: string | null;
  draft: number;
  review: number;
  complete: number;
  total: number;
};

/**
 * Per-member case counts for the admin workload card.
 *
 * Every active member is listed, including those with nothing on their plate — an idle
 * colleague is exactly what an admin looking at workload needs to see. Cases whose author
 * is no longer an active member are gathered into one "Former members" row rather than
 * dropped, so the rows still add up to the organisation's total.
 */
export function buildMemberWorkload(
  rows: AssessmentAnalyticsRow[],
  members: WorkloadMember[],
): MemberWorkload[] {
  const blank = () => ({ draft: 0, review: 0, complete: 0, total: 0 });
  const byUser = new Map<string, MemberWorkload>();
  for (const member of members) {
    if (!member.user_id) continue;
    const name = [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
    byUser.set(member.user_id, {
      key: member.user_id,
      memberId: member.id,
      name: name || "Unnamed member",
      avatarUrl: member.avatar_url ?? null,
      ...blank(),
    });
  }

  let orphans: MemberWorkload | null = null;
  for (const row of rows) {
    const userId = row.user_id ?? "";
    let entry = byUser.get(userId);
    if (!entry) {
      orphans ??= {
        key: "unattributed",
        memberId: null,
        name: "Former members",
        avatarUrl: null,
        ...blank(),
      };
      entry = orphans;
    }
    entry[normalizeAssessmentStatus(row.status)] += 1;
    entry.total += 1;
  }

  const all = [...byUser.values()];
  if (orphans) all.push(orphans);
  // Busiest first, then alphabetically so the order is stable between refreshes.
  return all.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
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
