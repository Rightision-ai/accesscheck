"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  LAHR_BAND_BY_ID,
  type LahrBandId,
} from "@/lib/accessibility/lahr/types";
import LahrBandBadge from "@/app/components/common/LahrBandBadge";
import type {
  AdaptationPlanSet,
  PlanLine,
  TierPlan,
  UnpricedWork,
} from "@/lib/adaptation-plans/types";
import { pollAdaptationPlan } from "@/lib/adaptation-plans/client";
import { formatCostRange } from "@/lib/adaptation-plans/narrative";
import { ENGINE_DISPLAY_NAME } from "@/lib/engine/models";

type Props = {
  surveyId: number;
  estimation: AdaptationPlanSet | null | undefined;
  currentBand: LahrBandId;
  enableReEstimate?: boolean;
  /** When no estimation exists yet, auto-fire the generator on mount. */
  autoGenerateIfMissing?: boolean;
  /** ISO timestamp of the last survey modification. When newer than `estimation.generatedAt`,
   * the plan is flagged stale. */
  surveyUpdatedAt?: string | null;
  /** Live signal from the report form: form inputs have changed but haven't been saved or
   * re-assessed yet. Forces the staleness banner regardless of timestamps. */
  inputsDirty?: boolean;
  /** Increment this counter to imperatively trigger a regeneration. Used by the report's
   * Reassess button to refresh the plan after a survey save. */
  regenerateSignal?: number;
  /** Bubble new estimations up so the parent can share them across siblings (e.g. overview
   *  tab) and avoid redundant regenerations on tab switches. */
  onEstimationChange?: (next: AdaptationPlanSet | null) => void;
  /** Notifies the parent whenever the internal POST-then-poll loop starts/stops. Used by the
   *  report's reassess flow to keep the page-level overlay up until the DFG regen finishes. */
  onRefreshingChange?: (isRefreshing: boolean) => void;
  /** The organisation's active rate card, so a plan priced by a superseded version can say so. */
  activeRateCard?: { id: string; version: number; label: string } | null;
  /** A finalised case is read-only: no auto-generate, no regenerate button. The server
   *  enforces this too (409) — this only avoids firing a request that would be refused. */
  locked?: boolean;
  /** Parent owns a regen in flight (e.g. user landed mid-job from a refresh). When true the
   *  appendix renders the loading state and skips its own auto-generate. */
  forceLoading?: boolean;
};

const DIFFICULTY_COLOR: Record<string, string> = {
  minor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  moderate: "text-amber-700 bg-amber-50 border-amber-200",
  major: "text-rose-700 bg-rose-50 border-rose-200",
};

export default function CostEstimationAppendix({
  surveyId,
  estimation: initialEstimation,
  currentBand,
  enableReEstimate = true,
  autoGenerateIfMissing = true,
  surveyUpdatedAt = null,
  inputsDirty = false,
  regenerateSignal,
  onEstimationChange,
  onRefreshingChange,
  activeRateCard = null,
  locked = false,
  forceLoading = false,
}: Props) {
  const [estimation, _setEstimation] = useState<
    AdaptationPlanSet | null | undefined
  >(initialEstimation);
  const setEstimation = useCallback(
    (next: AdaptationPlanSet | null | undefined) => {
      _setEstimation(next);
      if (next !== undefined) onEstimationChange?.(next);
    },
    [onEstimationChange],
  );
  // Reflect parent updates locally when a sibling tab regenerates and pushes a fresh plan up.
  useEffect(() => {
    if (initialEstimation !== undefined) _setEstimation(initialEstimation);
  }, [initialEstimation]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoFiredRef = useRef(false);

  const reEstimate = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/engine/cost-estimation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId }),
      });
      const payload = await res.json();
      if (!res.ok && res.status !== 202) {
        const baseMessage = payload?.error ?? "Re-estimate failed";
        const detail = payload?.details ? ` (${payload.details})` : "";
        throw new Error(`${baseMessage}${detail}`);
      }
      if (payload?.applicable === false) {
        setEstimation(null);
        return;
      }
      // Background pattern: poll until ready/failed. ~2 minutes max.
      const finalEstimation = await pollAdaptationPlan(surveyId);
      setEstimation(finalEstimation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  }, [surveyId, setEstimation]);

  useEffect(() => {
    if (
      autoGenerateIfMissing &&
      !locked &&
      !estimation &&
      currentBand !== "A" &&
      !autoFiredRef.current &&
      !isRefreshing &&
      !forceLoading
    ) {
      autoFiredRef.current = true;
      void reEstimate();
    }
  }, [
    autoGenerateIfMissing,
    estimation,
    currentBand,
    isRefreshing,
    reEstimate,
    forceLoading,
  ]);

  // Imperative regenerate hook for the Reassess button. Skip the very first render so the
  // initial undefined → 0 transition doesn't fire a duplicate generation.
  const lastRegenerateSignalRef = useRef<number | undefined>(regenerateSignal);
  useEffect(() => {
    if (regenerateSignal === undefined) return;
    if (regenerateSignal === lastRegenerateSignalRef.current) return;
    lastRegenerateSignalRef.current = regenerateSignal;
    if (currentBand === "A" || isRefreshing) return;
    void reEstimate();
  }, [regenerateSignal, currentBand, isRefreshing, reEstimate]);

  // Surface refresh state to the parent so the page-level overlay (in the report) knows when
  // the DFG regen finishes.
  useEffect(() => {
    onRefreshingChange?.(isRefreshing);
  }, [isRefreshing, onRefreshingChange]);

  if (currentBand === "A") return null;

  const surveyStale =
    !!estimation &&
    (inputsDirty ||
      (!!surveyUpdatedAt &&
        new Date(surveyUpdatedAt).getTime() >
          new Date(estimation.generatedAt).getTime()));
  // Both ids must be present: the built-in national fallback has no id, and the plan's FK is
  // ON DELETE SET NULL, so a null on either side means "provenance unknown", not "stale".
  const rateCardStale =
    !!estimation?.rateCardId &&
    !!activeRateCard?.id &&
    estimation.rateCardId !== activeRateCard.id;
  const isStale = surveyStale || rateCardStale;

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-primary-dark">
            DFG Adaptation Plan
          </h2>
          <p className="text-[11px] text-slate-500">
            UK Disabled Facilities Grant funding caps at £30,000. Three tiers
            below show what can be achieved at £15K, £20K, and £30K of spend.
          </p>
        </div>
        {enableReEstimate && (
          <button
            type="button"
            onClick={reEstimate}
            disabled={isRefreshing || locked}
          title={
            locked
              ? "This assessment is finalised. Reopen it to a draft to regenerate the plan."
              : undefined
          }
            className={`pdf-hide rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 ${
              isStale
                ? "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
                : "border-green-300 bg-green-50 text-primary-dark hover:bg-green-100"
            }`}
          >
            {isRefreshing
              ? "Estimating…"
              : isStale
                ? "Update plan"
                : estimation
                  ? "Re-estimate"
                  : "Generate plan"}
          </button>
        )}
      </div>

      {isStale && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {inputsDirty ? (
            "Form inputs have changed. Save the report and click Update plan to regenerate the DFG plan against the latest measurements."
          ) : surveyStale ? (
            <>
              The survey was edited after this plan was generated. Click{" "}
              <em>Update plan</em> to refresh it with the latest measurements.
            </>
          ) : (
            <>
              This plan was priced from {estimation?.rateCardLabel}. Your organisation has
              since published {activeRateCard?.label} (version {activeRateCard?.version}).
              Click <em>Update plan</em> to re-price it — prices never change on their own.
            </>
          )}
        </div>
      )}

      {error && (
        <div className="pdf-hide rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
          {error}
        </div>
      )}

      {forceLoading || isRefreshing ? (
        <EmptyState isLoading={true} locked={locked} />
      ) : !estimation ? (
        <EmptyState isLoading={false} locked={locked} />
      ) : (
        <>
          <SummaryRow estimation={estimation} currentBand={currentBand} />
          <div className="flex flex-col gap-4">
            {estimation.tiers.map((tier) => (
              <TierCard
                key={tier.budgetGbp}
                tier={tier}
                currentBand={currentBand}
                isCap={tier.budgetGbp === 30000}
              />
            ))}
          </div>
          {estimation.additionalWorks.length > 0 && (
            <AdditionalWorks works={estimation.additionalWorks} />
          )}
          <NarrativeBlock estimation={estimation} />
        </>
      )}
    </div>
  );
}

function EmptyState({
  isLoading,
  locked,
}: {
  isLoading: boolean;
  locked: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-green-200 bg-green-50/40 py-10 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Loader2
            size={40}
            className="relative z-[1] animate-spin text-primary"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary"
          />
        </div>
        <div>
          <h4 className="m-0 text-base font-extrabold text-primary-dark">
            Generating adaptation plan…
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            The Disabled Facilities Grant tiers are being recalculated. This
            usually finishes in 40–60 seconds.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-200 py-10 text-[12px] text-slate-500">
      <span>
        {locked
          ? "No adaptation plan was generated before this assessment was finalised."
          : "Adaptation plan not generated yet."}
      </span>
      {
        <span className="text-[11px] text-slate-400">
          Use the button above to generate one for this property.
        </span>
      }
    </div>
  );
}

function SummaryRow({
  estimation,
  currentBand,
}: {
  estimation: AdaptationPlanSet;
  currentBand: LahrBandId;
}) {
  const at30k = estimation.tiers.find((t) => t.budgetGbp === 30000);
  const reachesA = estimation.reachesBandAAt30k;

  return (
    <section className="pdf-avoid-break grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="flex flex-col items-start gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Current band
        </span>
        <LahrBandBadge band={currentBand} size="sm" showLabel={false} />
      </div>
      <div className="h-px bg-gradient-to-r from-slate-200 via-green-300 to-slate-200" />
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Potential band at £30K
        </span>
        <div className="flex items-center gap-3">
          {at30k && (
            <LahrBandBadge
              band={at30k.potentialBand}
              size="sm"
              showLabel={false}
            />
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              reachesA
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            {reachesA ? "Reaches band A" : "Below band A"}
          </span>
        </div>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  currentBand,
  isCap,
}: {
  tier: TierPlan;
  currentBand: LahrBandId;
  isCap: boolean;
}) {
  const uplifted = tier.potentialBand !== currentBand;
  const diffColor =
    DIFFICULTY_COLOR[tier.overallDifficulty] ?? DIFFICULTY_COLOR.minor;
  const isEmpty = tier.lines.length === 0;

  return (
    <article
      className={`pdf-avoid-break flex flex-col gap-3 rounded border p-4 ${
        isCap ? "border-green-300 bg-green-50/40" : "border-slate-200 bg-white"
      }`}
    >
      {/* Full-width meta row: budget on the left; stats and projected band inline on the
          right. Stats only render when a plan exists — empty tiers show just the
          "No adaptation" reason, avoiding the implication of a £0 plan that uplifts the band. */}
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-sm font-extrabold text-slate-900">
            £{tier.budgetGbp.toLocaleString()}
          </h3>
          {isCap && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              DFG cap
            </span>
          )}
        </div>
        {!isEmpty && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Spend
              </span>
              <span className="text-[12px] font-extrabold text-slate-800">
                {formatCostRange(tier.totalCost)}
              </span>
              {tier.totalCost.lowGbp !== tier.totalCost.highGbp && (
                <span className="text-[10px] text-slate-400">
                  (£{tier.totalCost.expectedGbp.toLocaleString()} expected)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Difficulty
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${diffColor}`}
              >
                {tier.overallDifficulty}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Projected band
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{
                  backgroundColor: LAHR_BAND_BY_ID[tier.potentialBand].color,
                }}
              >
                {tier.potentialBand}
              </span>
              {uplifted && (
                <span className="text-[10px] text-emerald-700">
                  ↑ from {currentBand}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {isEmpty ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
          <div className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mb-1">
            No adaptation available
          </div>
          <p className="m-0">
            {tier.unavailableReason ??
              "No feasible adaptation fits within this tier for this property. Consider the next tier."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 text-[11px] text-slate-700">
          {tier.lines.map((line) => (
            <li
              key={line.id}
              className="pdf-avoid-break rounded border border-slate-100 bg-white p-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-800">{line.label}</span>
                <span className="shrink-0 text-slate-600">
                  {formatCostRange(line.cost)}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {line.addressesRules.length > 0 && (
                  <>
                    Addresses Accessible Housing Rules rule
                    {line.addressesRules.length > 1 ? "s" : ""}{" "}
                    {line.addressesRules.join(", ")} ·{" "}
                  </>
                )}
                {line.trades.join(", ") || "general"}
              </div>
              {line.narrative && (
                <p className="mt-1 text-[10px] italic text-slate-600">
                  {line.narrative}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <ConfidencePill confidence={line.confidence} />
                {line.isInherited && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Carried over
                  </span>
                )}
                <span className="text-[9px] text-slate-400">
                  Priced from: {line.costBasis.rateCardLabel}
                  {line.costBasis.workItemCode
                    ? ` · ${line.costBasis.workItemCode} · ${line.costBasis.quantity} × ${line.costBasis.unit}`
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tier.droppedCandidates.length > 0 && (
        <DroppedList dropped={tier.droppedCandidates} />
      )}
    </article>
  );
}

function DroppedList({
  dropped,
}: {
  dropped: { label: string; reason: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded border border-slate-100 bg-slate-50 text-[10px] text-slate-600"
    >
      <summary className="cursor-pointer px-2 py-1 font-bold uppercase tracking-wider">
        {dropped.length} not included
      </summary>
      <ul className="space-y-1 px-2 pb-2">
        {dropped.map((d, i) => (
          <li key={i}>
            <span className="font-semibold text-slate-700">{d.label}</span> —{" "}
            {d.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Per-line confidence, replacing the single plan-level bar. A threshold ramp measured on site
 * and a wet room inferred from one photograph do not deserve the same number.
 */
function ConfidencePill({
  confidence,
}: {
  confidence: PlanLine["confidence"];
}) {
  const pct = Math.round(confidence.score * 100);
  const tone =
    pct >= 70
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : pct >= 50
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${tone}`}
      title={confidence.verifyNote ?? undefined}
    >
      {pct}% confidence
      {confidence.verifyOnSite ? " · verify on site" : ""}
    </span>
  );
}

/**
 * Work the model identified that no rate-card line prices. Kept visible but deliberately
 * outside the totals and the band projection — an unpriced guess must not move a band.
 */
function AdditionalWorks({ works }: { works: UnpricedWork[] }) {
  return (
    <section className="pdf-avoid-break rounded border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900">
      <h3 className="m-0 mb-1.5 text-[10px] font-black uppercase tracking-wider">
        Additional works identified — quote required
      </h3>
      <p className="m-0 mb-2 text-[10px] text-amber-800">
        Not priced from the rate card, so these are excluded from the tier totals and the
        projected band.
      </p>
      <ul className="space-y-1">
        {works.map((work, index) => (
          <li key={index}>
            <span className="font-semibold">{work.label}</span>
            {work.narrative ? ` — ${work.narrative}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NarrativeBlock({ estimation }: { estimation: AdaptationPlanSet }) {
  return (
    <section className="pdf-avoid-break space-y-3 rounded border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-700">
      <p>{estimation.overallNarrative}</p>
      {estimation.rationaleIfNotBandA && (
        <p className="text-slate-600">
          <span className="font-semibold">Gap to band A:</span>{" "}
          {estimation.rationaleIfNotBandA}
        </p>
      )}
      <p className="m-0 text-[10px] text-slate-500">
        Tiers are packed against the expected cost; the range shows the spread. Confidence is
        shown per line rather than for the plan as a whole.
      </p>
      <p className="text-[10px] text-slate-400">
        Priced from: {estimation.rateCardLabel}
        {estimation.rateCardEffectiveFrom
          ? ` · version ${estimation.rateCardEffectiveFrom}`
          : ""}{" "}
        · Generated {new Date(estimation.generatedAt).toLocaleString()} ·{" "}
        {ENGINE_DISPLAY_NAME}
      </p>
    </section>
  );
}
