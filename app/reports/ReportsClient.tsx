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
  Sparkles,
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
  formatGbpRange,
  type CostSummary,
  type Improvement,
  type MemberActivity,
} from "@/lib/reports/analytics";
import { ENGINE_DISPLAY_NAME } from "@/lib/engine/models";
import type { ReportFeedback } from "@/lib/reports/feedbackPrompt";
import { cn } from "@/lib/utils/cn";
import { exportBlocksToPdf, formatCoverDate } from "@/lib/reports/exportBlocksToPdf";

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
  const [feedback, setFeedback] = useState<ReportFeedback | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);

  // Asked for on demand rather than on load: it is a generation call, and most visits to
  // this page are to read a figure, not to be told what it means.
  const askForFeedback = async () => {
    setFeedbackPending(true);
    try {
      const response = await fetch("/api/reports/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(range),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Feedback could not be generated.");
        return;
      }
      setFeedback(body.feedback as ReportFeedback);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Feedback could not be generated.");
    } finally {
      setFeedbackPending(false);
    }
  };

  const download = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportBlocksToPdf(reportRef.current, {
        fileName: `accesscheck-report-${range.from}-to-${range.to}.pdf`,
        cover: {
          title: "Assessment report",
          subtitle: organisationName,
          meta: [
            `Reporting period ${formatCoverDate(range.from)} – ${formatCoverDate(range.to)}`,
            `Generated ${formatCoverDate(new Date().toISOString().slice(0, 10))}`,
          ],
        },
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
      value: formatGbp(cost.total.expectedGbp),
      hint:
        cost.casesPlanned === 0
          ? "No plans generated yet"
          : `${formatGbpRange(cost.total)} across ${cost.casesPlanned} case${cost.casesPlanned === 1 ? "" : "s"}`,
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
        <FeedbackCard
          feedback={feedback}
          pending={feedbackPending}
          onGenerate={askForFeedback}
        />

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
                  The fullest plan generated for each case, priced from your schedule of rates
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
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Each case is planned three times, once against each Disabled Facilities Grant
                cap. The figures below use the fullest plan generated for a case, so no property
                is counted more than once. Every cost is a{" "}
                <strong className="font-semibold text-slate-800">range</strong> — the large
                number is the expected cost, the range beneath it is the low and high estimate
                for the same work. They are indicative prices from your schedule of rates, not
                quotes, and they move once a contractor prices the job.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Figure
                  label="Total expected"
                  value={formatGbp(cost.total.expectedGbp)}
                  range={formatGbpRange(cost.total)}
                  hint={`Across ${cost.casesPlanned} planned case${cost.casesPlanned === 1 ? "" : "s"}`}
                />
                <Figure
                  label="Average per case"
                  value={formatGbp(cost.average?.expectedGbp ?? null)}
                  range={formatGbpRange(cost.average)}
                  hint="Mean of the expected costs"
                />
                <Figure
                  label="Median per case"
                  value={formatGbp(cost.medianExpectedGbp)}
                  hint="The middle case — one property's own expected cost, so it carries no range"
                />
                <Figure
                  label="Cases gaining a band"
                  value={`${cost.upliftedCases}`}
                  hint={`${percent(cost.upliftedCases, cost.casesPlanned)} of planned cases reach a better Accessible Housing Rules band`}
                />
              </div>

              <h3 className="mt-6 text-sm font-bold text-slate-900">Average cost by funding tier</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                What the plan at each cap typically comes to. The bar is the expected cost; the
                range after it is the low and high estimate. A tier that lifts few cases into a
                better band is buying comfort and safety rather than a band change — still worth
                doing, but it will not move the figures above.
              </p>
              <ul className="space-y-2.5">
                {cost.tiers.map((tier, index) => {
                  const widest = Math.max(1, ...cost.tiers.map((row) => row.average?.expectedGbp ?? 0));
                  return (
                    <li key={tier.budgetGbp} className="flex flex-wrap items-center gap-3">
                      <span className="w-16 shrink-0 text-sm font-bold tabular-nums text-slate-700">
                        £{(tier.budgetGbp / 1000).toFixed(0)}k
                      </span>
                      <span className="flex h-6 min-w-0 flex-1 basis-40 items-center rounded-md bg-slate-50">
                        <span
                          className="h-full rounded-md"
                          style={{
                            width: `${((tier.average?.expectedGbp ?? 0) / widest) * 100}%`,
                            backgroundColor: TIER_RAMP[Math.min(index, TIER_RAMP.length - 1)],
                          }}
                          title={`${formatGbp(tier.average?.expectedGbp ?? null)} expected across ${tier.cases} plans`}
                        />
                      </span>
                      <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                        {formatGbp(tier.average?.expectedGbp ?? null)}
                      </span>
                      <span className="w-36 shrink-0 text-right text-xs tabular-nums text-slate-500">
                        {formatGbpRange(tier.average)}
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
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Counted once per case, from that case&apos;s fullest plan. The bar is how many plans
            the work appears in; the money is what one instance of it typically costs — the
            expected figure first, then the low-to-high range. Works at the top are where a
            framework contract or a bulk price would pay for itself soonest.
          </p>

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
                    <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                      {improvement.cases}
                      <span className="sr-only"> cases</span>
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-slate-800">
                      {formatGbp(improvement.average.expectedGbp)}
                    </span>
                    <span className="w-36 shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {formatGbpRange(improvement.average)}
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

/**
 * Engine-written commentary on the figures below it.
 *
 * It sits at the top because that is where a reader looks first, but it is generated only
 * when asked for, and it is labelled as a reading of the data rather than a finding —
 * these are estimates and small samples, and the card says so.
 */
function FeedbackCard({
  feedback,
  pending,
  onGenerate,
}: {
  feedback: ReportFeedback | null;
  pending: boolean;
  onGenerate: () => void;
}) {
  return (
    <section className="report-block rounded-2xl border border-primary/25 bg-primary-light/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Report feedback</h2>
            <p className="text-sm text-slate-600">
              {ENGINE_DISPLAY_NAME} reading the figures on this page
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="pdf-hide inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {pending ? "Reading the report…" : feedback ? "Regenerate" : "Generate feedback"}
        </button>
      </div>

      {!feedback && !pending && (
        <p className="mt-4 text-sm text-slate-600">
          Ask for a written read of this period — what stands out, what to do next, and what to
          be careful about. It is included in the PDF export.
        </p>
      )}

      {pending && !feedback && (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-3 animate-pulse rounded bg-white/80" style={{ width: `${90 - row * 15}%` }} />
          ))}
        </div>
      )}

      {feedback && (
        <div className={cn("mt-4 space-y-5", pending && "opacity-60")}>
          <p className="text-lg font-bold leading-snug text-slate-900">{feedback.headline}</p>
          <FeedbackList title="What stands out" items={feedback.observations} />
          <FeedbackList title="What to do next" items={feedback.recommendations} />
          <FeedbackList title="Read with care" items={feedback.watchOuts} muted />
          <p className="border-t border-primary/20 pt-3 text-xs text-slate-500">
            Generated from the figures on this page. Costs are indicative estimates priced from
            your schedule of rates, not quotes — check anything you intend to act on.
          </p>
        </div>
      )}
    </section>
  );
}

function FeedbackList({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-primary-dark">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "flex gap-2 text-sm leading-relaxed",
              muted ? "text-slate-500" : "text-slate-700",
            )}
          >
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One figure: the expected value large, its range beneath it, and a line saying what the
 * number actually counts. The range is the point — a single figure would read as a quote.
 */
function Figure({
  label,
  value,
  range,
  hint,
}: {
  label: string;
  value: string;
  range?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {range && <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-600">{range}</p>}
      {hint && <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

function percent(value: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
