"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileDown, Loader2, PoundSterling } from "lucide-react";
import { toast } from "sonner";
import { exportBlocksToPdf, formatCoverDate } from "@/lib/reports/exportBlocksToPdf";
import LahrBandBadge from "@/app/components/common/LahrBandBadge";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type {
  AdaptationPlanSet,
  DfgBudgetGbp,
  PlanLine,
  TierPlan,
} from "@/lib/adaptation-plans/types";
import { formatCostRange } from "@/lib/adaptation-plans/narrative";
import { ACCESSCHECK_ESTIMATION_LABEL } from "@/lib/rate-cards/accesscheckEstimation";
import { ENGINE_DISPLAY_NAME } from "@/lib/engine/models";

type Props = {
  surveyId: number;
  currentBand: LahrBandId;
  tier: TierPlan | null;
  tierBudget: DfgBudgetGbp;
  planSet: AdaptationPlanSet | null;
  ruleLookup: Record<number, { capBand: string; description: string }>;
};

export default function CostEstimationDetailView({
  surveyId,
  currentBand,
  tier,
  tierBudget,
  planSet,
  ruleLookup,
}: Props) {
  const isCap = tierBudget === 30000;
  const planRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    if (!planRef.current) return;
    setExporting(true);
    try {
      await exportBlocksToPdf(planRef.current, {
        fileName: `accesscheck-adaptation-plan-${surveyId}-${tierBudget}.pdf`,
        cover: {
          title: `£${tierBudget.toLocaleString()} adaptation plan`,
          subtitle: `Case ${surveyId}`,
          meta: [
            tier ? `${tier.lines.length} recommended adaptation${tier.lines.length === 1 ? "" : "s"}` : "No plan generated",
            // Spelled out rather than an arrow: the cover is set in a WinAnsi core font.
            tier ? `Band ${currentBand} to ${tier.potentialBand}` : `Current band ${currentBand}`,
            `Generated ${formatCoverDate(new Date().toISOString().slice(0, 10))}`,
          ],
          spineText: "ADAPTATION PLAN",
        },
      });
      toast.success("Adaptation plan downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/cases/${surveyId}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-dark hover:text-primary-dark"
          >
            <ChevronLeft size={16} />
            Back to case overview
          </Link>
          <button
            type="button"
            onClick={download}
            disabled={exporting || !tier}
            title={tier ? undefined : "Generate the plan before exporting it"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,183,91,0.25)] transition hover:bg-primary-dark disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {exporting ? "Building PDF…" : "Download PDF"}
          </button>
        </div>

        <div ref={planRef}>
        <header className="report-block mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-primary-dark">
              <PoundSterling size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">
                DFG Adaptation Plan
              </span>
              {isCap && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  DFG cap
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              £{tierBudget.toLocaleString()} plan
            </h1>
            {tier && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
                {tierPlainSummary(tier, currentBand, planSet)}
              </p>
            )}
          </div>

          {/* Band pathway only when this tier actually has a plan — otherwise it would imply
              an uplift the budget can't deliver. */}
          {tier && tier.lines.length > 0 && (
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Band pathway
              </span>
              {/* Two band badges are ~460px side by side, so they stack below sm and the
                  arrow turns to point down rather than overflowing a phone. */}
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                <LahrBandBadge band={currentBand} size="sm" showLabel={false} />
                <span className="rotate-90 text-slate-400 sm:rotate-0">→</span>
                <LahrBandBadge
                  band={tier.potentialBand}
                  size="sm"
                  showLabel={false}
                />
              </div>
            </div>
          )}
        </header>

        {!tier ? (
          <section className="report-block mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            This plan has not been generated yet. Return to the case overview to
            generate it.
          </section>
        ) : (
          <>
            <HeadlineStrip tier={tier} planSet={planSet} />

            {planSet?.rationaleIfNotBandA && tier.budgetGbp === 30000 && (
              <section className="report-block mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                <p className="m-0">
                  <span className="font-semibold">Beyond this budget:</span>{" "}
                  {planSet.rationaleIfNotBandA}
                </p>
              </section>
            )}

            <section className="report-block mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Recommended adaptations
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Each entry is described in clinical terms for OT handover — what
                the work involves, why it matters for this tenant, and what the
                surveyor should verify on site.
              </p>

              <ol className="mt-4 space-y-5">
                {tier.lines.map((line, idx) => (
                  <AdaptationCard
                    key={line.id}
                    index={idx + 1}
                    line={line}
                    ruleLookup={ruleLookup}
                    isInherited={line.isInherited}
                  />
                ))}
                {tier.lines.length === 0 && (
                  <li className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                      No plan at this budget
                    </div>
                    <p className="m-0">
                      {tier.unavailableReason ??
                        "No feasible adaptation fits this budget for this property. The higher tier may be needed before any meaningful Accessible Housing Rules band uplift is possible."}
                    </p>
                  </li>
                )}
              </ol>
            </section>

            {tier.droppedCandidates.length > 0 && (
              <section className="report-block mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Considered and set aside
                </h2>
                <ul className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  {tier.droppedCandidates.map((d, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed text-slate-700"
                    >
                      <span className="font-semibold text-slate-800">
                        {d.label}:
                      </span>{" "}
                      {d.reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {planSet && <FooterMeta planSet={planSet} />}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function HeadlineStrip({
  tier,
  planSet,
}: {
  tier: TierPlan;
  planSet: AdaptationPlanSet | null;
}) {
  return (
    <section className="report-block mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <HeadlineTile
        label="Total cost"
        value={formatCostRange(tier.totalCost)}
        sub={(() => {
          const expected = tier.totalCost.expectedGbp;
          const newSpend = tier.lines
            .filter((line) => !line.isInherited)
            .reduce((total, line) => total + line.cost.expectedGbp, 0);
          const cap = `£${expected.toLocaleString()} expected, within £${tier.budgetGbp.toLocaleString()} cap`;
          return newSpend > 0 && newSpend < expected
            ? `£${newSpend.toLocaleString()} new · ${cap}`
            : cap;
        })()}
      />
      <HeadlineTile
        label="Overall disruption"
        value={tier.overallDifficulty}
        sub={
          tier.overallDifficulty === "minor"
            ? "tenant can remain in place"
            : tier.overallDifficulty === "moderate"
              ? "temporary disruption in affected rooms"
              : "significant works; consider decant"
        }
      />
      {/* Which schedule of rates priced these lines — the same provenance the plans tab shows,
          so a surveyor does not have to scroll to the footer to answer "priced from what?". */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Schedule of rates
        </div>
        <div className="mt-1 text-sm font-extrabold leading-snug text-slate-900">
          {planSet?.rateCardLabel ?? ACCESSCHECK_ESTIMATION_LABEL}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {planSet?.rateCardEffectiveFrom
            ? `Version ${planSet.rateCardEffectiveFrom}`
            : "Indicative — confirm against a quote"}
        </div>
      </div>
    </section>
  );
}

function HeadlineTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold capitalize text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function AdaptationCard({
  index,
  line,
  ruleLookup,
  isInherited,
}: {
  index: number;
  line: PlanLine;
  ruleLookup: Record<number, { capBand: string; description: string }>;
  isInherited: boolean;
}) {
  return (
    <li
      className={`rounded-xl border p-5 shadow-sm ${isInherited ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Adaptation {index}
            </div>
            {isInherited && (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Carried over
              </span>
            )}
            {!isInherited && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-dark">
                New this tier
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-base font-extrabold text-slate-900">
            {line.label}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-800">
            {formatCostRange(line.cost)}
          </div>
          <div className="text-[11px] text-slate-500">
            £{line.cost.expectedGbp.toLocaleString()} expected
          </div>
          <div className="text-[11px] text-slate-500 capitalize">
            {line.difficulty} disruption
          </div>
        </div>
      </header>

      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        <p className="m-0 text-[13px] font-medium text-primary-dark">
          {line.selectionReason}
        </p>
        <p className="m-0">{adaptationFluentBlurb(line, ruleLookup)}</p>
        {line.narrative && (
          <p className="m-0 italic text-slate-600">{line.narrative}</p>
        )}
        {line.preconditions && (
          <p className="m-0 text-[13px] text-slate-600">
            <span className="font-semibold">Before quoting, confirm:</span>{" "}
            {line.preconditions}
          </p>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <ConfidenceBar confidence={line.confidence} />
        <span className="text-[10px] text-slate-400">
          Priced from: {line.costBasis.rateCardLabel}
          {line.costBasis.workItemCode
            ? ` · ${line.costBasis.workItemCode} · ${line.costBasis.quantity} × ${line.costBasis.unit}`
            : ""}
        </span>
      </footer>
    </li>
  );
}

/** Per-line confidence, replacing the plan-level bar that used to sit in the footer. */
function ConfidenceBar({ confidence }: { confidence: PlanLine["confidence"] }) {
  const pct = Math.round(confidence.score * 100);
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Confidence
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-[10px] font-semibold text-slate-600">{pct}%</span>
      {confidence.verifyOnSite && (
        <span
          className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700"
          title={confidence.verifyNote ?? undefined}
        >
          Verify on site
        </span>
      )}
    </span>
  );
}

function FooterMeta({ planSet }: { planSet: AdaptationPlanSet }) {
  return (
    <section className="report-block mt-6 rounded-xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500">
      <p className="m-0">
        <span className="font-bold uppercase tracking-wider">Priced from</span>{" "}
        {planSet.rateCardLabel}
        {planSet.rateCardEffectiveFrom
          ? ` · version ${planSet.rateCardEffectiveFrom}`
          : ""}
      </p>
      <p className="mt-2 m-0">
        Tiers are packed against the expected cost; each line shows its own range and
        confidence. Generated {new Date(planSet.generatedAt).toLocaleString()} using{" "}
        {ENGINE_DISPLAY_NAME}. Figures are indicative — obtain a quote from a qualified
        contractor before commissioning works.
      </p>
    </section>
  );
}

function tierPlainSummary(
  tier: TierPlan,
  currentBand: LahrBandId,
  planSet: AdaptationPlanSet | null,
): string {
  const count = tier.lines.length;
  if (count === 0) {
    return `No feasible adaptations fit within a £${tier.budgetGbp.toLocaleString()} budget for this property. The higher tier may be needed before any meaningful band uplift is possible.`;
  }
  const bandChange =
    tier.potentialBand === currentBand
      ? `the property stays at band ${currentBand} — the bundled works reduce hazards but are not enough to lift the overall Accessible Housing Rules classification`
      : `the property's Accessible Housing Rules band is projected to move from ${currentBand} to ${tier.potentialBand}`;
  const disruption =
    tier.overallDifficulty === "minor"
      ? "The tenant should be able to remain in the home throughout."
      : tier.overallDifficulty === "moderate"
        ? "Affected rooms will be out of use for short periods, but full decant should not be required."
        : "Works are substantial — discuss a temporary decant with the tenant and adult social care before commissioning.";
  const reachA =
    tier.budgetGbp === 30000 && planSet?.reachesBandAAt30k === false
      ? ` Reaching band A is not feasible within the DFG cap for this property.`
      : "";
  return `Bundling ${count} adaptation${count === 1 ? "" : "s"} under a £${tier.budgetGbp.toLocaleString()} budget, ${bandChange}. ${disruption}${reachA}`;
}

function adaptationFluentBlurb(
  a: PlanLine,
  ruleLookup: Record<number, { capBand: string; description: string }>,
): string {
  const trades =
    a.trades.map((t) => t.replace(/_/g, " ")).join(", ") ||
    "a general contractor";
  const addressedDescriptions = a.addressesRules
    .map((n) => ruleLookup[n]?.description)
    .filter((d): d is string => Boolean(d));
  const rulesClause =
    addressedDescriptions.length === 0
      ? ""
      : ` This work resolves the Accessible Housing Rules trigger${
          addressedDescriptions.length > 1 ? "s" : ""
        }: ${addressedDescriptions.slice(0, 2).join("; ")}${
          addressedDescriptions.length > 2
            ? ` (and ${addressedDescriptions.length - 2} related rule${
                addressedDescriptions.length - 2 === 1 ? "" : "s"
              })`
            : ""
        }.`;
  const difficultyClause =
    a.difficulty === "minor"
      ? "It is a short, low-disruption job"
      : a.difficulty === "moderate"
        ? "Moderate disruption is expected"
        : "This is a substantive build";
  return `${difficultyClause} — typically delivered by ${trades} at ${formatCostRange(a.cost)}.${rulesClause}`;
}
