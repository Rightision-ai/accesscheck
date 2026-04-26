"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, PoundSterling } from "lucide-react";
import LahrBandBadge from "@/app/components/common/LahrBandBadge";
import {
  LAHR_BAND_BY_ID,
  type LahrBandId,
} from "@/lib/accessibility/lahr/types";
import type {
  CostEstimation,
  DfgBudgetGbp,
  TierPlan,
} from "@/lib/accessibility/cost-estimation/types";

type Props = {
  surveyId: number;
  currentBand: LahrBandId;
  tier: TierPlan | null;
  tierBudget: DfgBudgetGbp;
  estimation: CostEstimation | null;
  ruleLookup: Record<number, { capBand: string; description: string }>;
};

export default function CostEstimationDetailView({
  surveyId,
  currentBand,
  tier,
  tierBudget,
  estimation,
  ruleLookup,
}: Props) {
  const isCap = tierBudget === 30000;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl p-6">
        <Link
          href={`/cases/${surveyId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
        >
          <ChevronLeft size={16} />
          Back to case overview
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-violet-700">
              <PoundSterling size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">
                DFG Adoption Plan
              </span>
              {isCap && (
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  DFG cap
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              £{tierBudget.toLocaleString()} plan
            </h1>
            {tier && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
                {tierPlainSummary(tier, currentBand, estimation)}
              </p>
            )}
          </div>

          {tier && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Band pathway
              </span>
              <div className="flex items-center gap-2">
                <LahrBandBadge band={currentBand} size="sm" showLabel={false} />
                <span className="text-slate-400">→</span>
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
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            This plan has not been generated yet. Return to the case overview to
            generate it.
          </section>
        ) : (
          <>
            <HeadlineStrip
              tier={tier}
              currentBand={currentBand}
              reachesBandA={estimation?.reachesBandAAt30k ?? false}
            />

            {estimation?.rationaleIfNotBandA && tier.budgetGbp === 30000 && (
              <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                <p className="m-0">
                  <span className="font-semibold">Beyond this budget:</span>{" "}
                  {estimation.rationaleIfNotBandA}
                </p>
              </section>
            )}

            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Recommended adaptations
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Each entry is described in clinical terms for OT handover — what
                the work involves, why it matters for this tenant, and what the
                surveyor should verify on site.
              </p>

              <ol className="mt-4 space-y-5">
                {tier.adaptations.map((a, idx) => (
                  <AdaptationCard
                    key={idx}
                    index={idx + 1}
                    adaptation={a}
                    ruleLookup={ruleLookup}
                  />
                ))}
                {tier.adaptations.length === 0 && (
                  <li className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    No adaptations fit this budget. The next tier may be needed.
                  </li>
                )}
              </ol>
            </section>

            {tier.droppedCandidates.length > 0 && (
              <section className="mt-6">
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

            {estimation && <FooterMeta estimation={estimation} />}
          </>
        )}
      </div>
    </div>
  );
}

function HeadlineStrip({
  tier,
  currentBand,
  reachesBandA,
}: {
  tier: TierPlan;
  currentBand: LahrBandId;
  reachesBandA: boolean;
}) {
  const bandColor = LAHR_BAND_BY_ID[tier.potentialBand].color;
  const uplifted = tier.potentialBand !== currentBand;
  return (
    <section className="mt-4 grid gap-3 md:grid-cols-3">
      <HeadlineTile
        label="Total cost"
        value={`£${tier.totalCostGbp.toLocaleString()}`}
        sub={`within £${tier.budgetGbp.toLocaleString()} cap`}
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
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Projected band
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold text-white"
            style={{ backgroundColor: bandColor }}
          >
            {tier.potentialBand}
          </span>
          {uplifted ? (
            <span className="text-[11px] font-semibold text-emerald-700">
              ↑ from {currentBand}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">unchanged</span>
          )}
        </div>
        {tier.budgetGbp === 30000 && (
          <div
            className={`mt-2 text-[11px] font-semibold ${
              reachesBandA ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {reachesBandA ? "Reaches band A" : "Below band A"}
          </div>
        )}
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
  adaptation,
  ruleLookup,
}: {
  index: number;
  adaptation: TierPlan["adaptations"][number];
  ruleLookup: Record<number, { capBand: string; description: string }>;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Adaptation {index}
          </div>
          <h3 className="mt-0.5 text-base font-extrabold text-slate-900">
            {adaptation.label}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-800">
            £{adaptation.costGbp.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 capitalize">
            {adaptation.difficulty} disruption
          </div>
        </div>
      </header>

      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        <p className="m-0">{adaptationFluentBlurb(adaptation, ruleLookup)}</p>
        {adaptation.narrative && (
          <p className="m-0 italic text-slate-600">{adaptation.narrative}</p>
        )}
        {adaptation.preconditions && (
          <p className="m-0 text-[13px] text-slate-600">
            <span className="font-semibold">Before quoting, confirm:</span>{" "}
            {adaptation.preconditions}
          </p>
        )}
      </div>
    </li>
  );
}

function FooterMeta({ estimation }: { estimation: CostEstimation }) {
  const confidencePct = Math.round(estimation.confidence * 100);
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500">
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider">Confidence</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-violet-500"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="font-semibold text-slate-600">{confidencePct}%</span>
      </div>
      <p className="mt-2 m-0">
        Generated {new Date(estimation.generatedAt).toLocaleString()} using{" "}
        Homingo AI Engine. Figures are indicative — obtain a quote from a
        qualified contractor before commissioning works.
      </p>
    </section>
  );
}

function tierPlainSummary(
  tier: TierPlan,
  currentBand: LahrBandId,
  estimation: CostEstimation | null,
): string {
  const count = tier.adaptations.length;
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
    tier.budgetGbp === 30000 && estimation?.reachesBandAAt30k === false
      ? ` Reaching band A is not feasible within the DFG cap for this property.`
      : "";
  return `Bundling ${count} adaptation${count === 1 ? "" : "s"} under a £${tier.budgetGbp.toLocaleString()} budget, ${bandChange}. ${disruption}${reachA}`;
}

function adaptationFluentBlurb(
  a: TierPlan["adaptations"][number],
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
  return `${difficultyClause} — typically delivered by ${trades} at approximately £${a.costGbp.toLocaleString()}.${rulesClause}`;
}
