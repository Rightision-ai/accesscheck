"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Award,
  ClipboardCheck,
  Download,
  FileDown,
  Hammer,
  Loader2,
  PoundSterling,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import BandDonutChart from "@/app/components/dashboard/BandDonutChart";
import WeeklyTrendChart, { type TrendWeek } from "@/app/components/dashboard/WeeklyTrendChart";
import { ASSESSMENT_STATUS_META } from "@/lib/assessments/status";
import type { BandSlice } from "@/lib/assessments/analytics";
import {
  formatGbp,
  type CostSummary,
  type Improvement,
  type MemberActivity,
} from "@/lib/reports/analytics";
import { cn } from "@/lib/utils/cn";
import { exportReportPdf } from "./exportReportPdf";

/**
 * The organisation report.
 *
 * Every block is a `.report-block`, which is the unit the PDF export captures and keeps
 * whole — add a section and it appears in the PDF with no further work.
 *
 * Colour follows the job each chart does: assessment status uses the reserved status
 * palette it uses everywhere else, bands use their own scale, and the two magnitude charts
 * (budget tiers, most-planned works) are single-hue ramps rather than a set of unrelated
 * hues, because they compare quantities of one measure and not identities.
 */

type Summary = {
  total: number;
  complete: number;
  review: number;
  draft: number;
  medianCompletionDays: number | null;
  readiness: { ready: number; partial: number; incomplete: number };
};

type Props = {
  range: { from: string; to: string };
  organisationName: string;
  summary: Summary;
  trend: TrendWeek[];
  bands: BandSlice[];
  cost: CostSummary;
  improvements: Improvement[];
  activity: MemberActivity[];
  topMember: MemberActivity | null;
  csvHref: string;
  isAdmin: boolean;
};

/** One hue, light → dark: these bars compare amounts of the same measure, not categories. */
const TIER_RAMP = ["#86efac", "#34d399", "#0f7a44"];
const IMPROVEMENT_HUE = "#0FB75B";

const dayLabel = (days: number | null) => (days == null ? "—" : `${Math.round(days)}d`);

export default function ReportsClient({
  range,
  organisationName,
  summary,
  trend,
  bands,
  cost,
  improvements,
  activity,
  topMember,
  csvHref,
  isAdmin,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportReportPdf(reportRef.current, {
        fileName: `accesscheck-report-${range.from}-to-${range.to}.pdf`,
        title: `${organisationName} — assessment report, ${range.from} to ${range.to}`,
      });
      toast.success("Report downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the PDF.");
    } finally {
      setExporting(false);
    }
  };

  const headline = [
    {
      label: "Assessments",
      value: summary.total,
      hint: `${summary.draft} draft · ${summary.review} in review`,
      icon: ClipboardCheck,
      card: "border-primary-dark bg-gradient-to-br from-primary to-primary-dark text-white",
      hintClass: "text-white/75",
      iconClass: "bg-white/15 text-white",
    },
    {
      label: "Finalised",
      value: summary.complete,
      hint: `${percent(summary.complete, summary.total)} of the period`,
      icon: Award,
      card: "border-emerald-200 bg-emerald-50 text-emerald-900",
      hintClass: "text-emerald-700",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Median completion",
      value: dayLabel(summary.medianCompletionDays),
      hint: "Creation to finalisation",
      icon: Timer,
      card: "border-violet-200 bg-violet-50 text-violet-900",
      hintClass: "text-violet-700",
      iconClass: "bg-violet-100 text-violet-700",
    },
    {
      label: "Planned adaptation spend",
      value: formatGbp(cost.totalExpectedGbp),
      hint: `${cost.casesPlanned} case${cost.casesPlanned === 1 ? "" : "s"} planned`,
      icon: PoundSterling,
      card: "border-amber-200 bg-amber-50 text-amber-900",
      hintClass: "text-amber-700",
      iconClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Organisation analytics</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">Assessment reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Volume, turnaround, adaptation costs and who is doing the work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={download}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,183,91,0.25)] transition hover:bg-primary-dark disabled:opacity-60"
          >
            {exporting ? <Loader2 size={17} className="animate-spin" /> : <FileDown size={17} />}
            {exporting ? "Building PDF…" : "Download PDF"}
          </button>
          <Link
            href={csvHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-primary/40 hover:text-primary"
          >
            <Download size={17} /> Export CSV
          </Link>
        </div>
      </div>

      {/* The date filters are a plain GET form so a report is a shareable URL. */}
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-bold text-slate-600">
          From
          <input
            type="date"
            name="from"
            defaultValue={range.from}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          To
          <input
            type="date"
            name="to"
            defaultValue={range.to}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
          Update
        </button>
      </form>

      <div ref={reportRef} className="space-y-6">
        <section className="report-block grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {headline.map(({ label, value, hint, icon: Icon, card, hintClass, iconClass }) => (
            <div key={label} className={`rounded-2xl border p-5 ${card}`}>
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
              >
                <Icon size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
              <p className="mt-1 text-3xl font-extrabold leading-none">{value}</p>
              <p className={`mt-2 text-xs font-semibold ${hintClass}`}>{hint}</p>
            </div>
          ))}
        </section>

        <div className="report-block grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <WeeklyTrendChart weeks={trend} />
          </section>
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Accessibility bands</h2>
            <p className="mb-6 text-sm text-slate-500">
              Share of assessed stock by Accessible Housing Rules band
            </p>
            <BandDonutChart slices={bands} />
          </section>
        </div>

        <section className="report-block rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <PoundSterling size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">Adaptation plan costs</h2>
                <p className="text-sm text-slate-500">
                  Expected cost of the fullest plan generated for each case
                </p>
              </div>
            </div>
          </div>

          {cost.casesPlanned === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No adaptation plans were generated for cases in this period.
            </p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Figure label="Total expected" value={formatGbp(cost.totalExpectedGbp)} />
                <Figure label="Average per case" value={formatGbp(cost.averageGbp)} />
                <Figure label="Median per case" value={formatGbp(cost.medianGbp)} />
                <Figure
                  label="Cases gaining a band"
                  value={`${cost.upliftedCases}`}
                  hint={`${percent(cost.upliftedCases, cost.casesPlanned)} of planned cases`}
                />
              </div>

              <h3 className="mt-6 text-sm font-bold text-slate-900">Average cost by funding tier</h3>
              <p className="mb-3 text-xs text-slate-500">
                Every case is planned against each Disabled Facilities Grant tier; this is what
                the plan at each cap typically comes to.
              </p>
              <ul className="space-y-2.5">
                {cost.tiers.map((tier, index) => {
                  const widest = Math.max(1, ...cost.tiers.map((row) => row.averageGbp ?? 0));
                  return (
                    <li key={tier.budgetGbp} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-sm font-bold tabular-nums text-slate-700">
                        £{(tier.budgetGbp / 1000).toFixed(0)}k
                      </span>
                      <span className="flex h-6 min-w-0 flex-1 items-center rounded-md bg-slate-50">
                        <span
                          className="h-full rounded-md"
                          style={{
                            width: `${((tier.averageGbp ?? 0) / widest) * 100}%`,
                            backgroundColor: TIER_RAMP[Math.min(index, TIER_RAMP.length - 1)],
                          }}
                          title={`${formatGbp(tier.averageGbp)} average across ${tier.cases} plans`}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                        {formatGbp(tier.averageGbp)}
                      </span>
                      <span className="w-28 shrink-0 text-right text-xs text-slate-500">
                        {tier.upliftedCases} of {tier.cases} uplift
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="report-block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Hammer size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-slate-950">Most-planned improvements</h2>
              <p className="text-sm text-slate-500">
                The works appearing in the most plans, and what each typically costs
              </p>
            </div>
          </div>

          {improvements.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No planned works to summarise for this period.
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {improvements.map((improvement) => {
                const widest = Math.max(...improvements.map((row) => row.cases));
                return (
                  <li key={improvement.label} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1 basis-56 truncate text-sm font-semibold text-slate-800">
                      {improvement.label}
                    </span>
                    <span className="flex h-6 min-w-0 flex-[2] basis-40 items-center rounded-md bg-slate-50">
                      <span
                        className="h-full rounded-md"
                        style={{
                          width: `${(improvement.cases / widest) * 100}%`,
                          backgroundColor: IMPROVEMENT_HUE,
                        }}
                        title={`${improvement.cases} cases`}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                      {improvement.cases}
                      <span className="sr-only"> cases</span>
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {formatGbp(improvement.averageGbp)} avg
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {isAdmin && (
          <section className="report-block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Users size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-950">Member activity</h2>
                  <p className="text-sm text-slate-500">
                    Cases by the member who created them, over the selected period
                  </p>
                </div>
              </div>
              <Link
                href="/settings/members"
                className="pdf-hide text-sm font-bold text-primary"
              >
                Manage members
              </Link>
            </div>

            {topMember && (
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/25 bg-primary-light p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <TrendingUp size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">
                    Top member this period
                  </p>
                  <p className="truncate text-lg font-extrabold text-slate-950">{topMember.name}</p>
                </div>
                <dl className="ml-auto flex flex-wrap gap-6 text-right">
                  <div>
                    <dt className="text-xs font-semibold text-slate-600">Finalised</dt>
                    <dd className="text-xl font-extrabold text-slate-950">
                      {topMember.completedInPeriod}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-600">Median completion</dt>
                    <dd className="text-xl font-extrabold text-slate-950">
                      {dayLabel(topMember.medianCompletionDays)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {activity.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No members to report on.</p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-bold">Member</th>
                      <th className="py-2 pr-3 font-bold">Mix</th>
                      <th className="py-2 pr-3 text-right font-bold">Cases</th>
                      <th className="py-2 pr-3 text-right font-bold">Finalised</th>
                      <th className="py-2 pr-3 text-right font-bold">In review</th>
                      <th className="py-2 pr-3 text-right font-bold">Draft</th>
                      <th className="py-2 pr-3 text-right font-bold">Median</th>
                      <th className="py-2 text-right font-bold">Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((member) => {
                      const busiest = Math.max(1, ...activity.map((row) => row.total));
                      return (
                        <tr key={member.key} className="border-b border-slate-100">
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">
                            {member.memberId ? (
                              <Link
                                href={`/settings/members/${member.memberId}`}
                                className="hover:text-primary hover:underline"
                              >
                                {member.name}
                              </Link>
                            ) : (
                              member.name
                            )}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="flex h-2.5 w-40 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                              {(["review", "draft", "complete"] as const).map((key) =>
                                member[key] > 0 ? (
                                  <span
                                    key={key}
                                    className="rounded-full"
                                    style={{
                                      width: `${(member[key] / busiest) * 100}%`,
                                      backgroundColor: ASSESSMENT_STATUS_META[key].colour,
                                    }}
                                    title={`${member[key]} ${ASSESSMENT_STATUS_META[key].label.toLowerCase()}`}
                                  />
                                ) : null,
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-extrabold tabular-nums text-slate-900">
                            {member.total}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-700">
                            {member.complete}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-amber-700">
                            {member.review}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                            {member.draft}
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">
                            {dayLabel(member.medianCompletionDays)}
                          </td>
                          <td className="py-2.5 text-right text-xs tabular-nums text-slate-500">
                            {member.lastActivity
                              ? new Date(member.lastActivity).toLocaleDateString("en-GB")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  {(["complete", "review", "draft"] as const).map((key) => (
                    <span key={key} className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: ASSESSMENT_STATUS_META[key].colour }}
                      />
                      {ASSESSMENT_STATUS_META[key].label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="report-block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">Evidence quality</h2>
          <p className="mb-4 text-sm text-slate-500">
            How complete the evidence behind these assessments is
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Evidence ready", value: summary.readiness.ready, tone: "bg-emerald-50 text-emerald-900" },
              { label: "Partially ready", value: summary.readiness.partial, tone: "bg-amber-50 text-amber-900" },
              { label: "Missing evidence", value: summary.readiness.incomplete, tone: "bg-rose-50 text-rose-900" },
            ].map((row) => (
              <div key={row.label} className={cn("rounded-xl p-4", row.tone)}>
                <p className="text-sm font-semibold opacity-80">{row.label}</p>
                <p className="mt-1 text-2xl font-extrabold">{row.value}</p>
                <p className="mt-1 text-xs font-semibold opacity-70">
                  {percent(row.value, summary.total)} of assessments
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>}
    </div>
  );
}

function percent(value: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
