"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  PoundSterling,
  RefreshCw,
} from "lucide-react";
import {
  LAHR_BAND_BY_ID,
  type LahrBandId,
} from "@/lib/accessibility/lahr/types";
import type { AdaptationPlanSet, TierPlan } from "@/lib/adaptation-plans/types";
import { pollAdaptationPlan } from "@/lib/adaptation-plans/client";
import { formatCostRange } from "@/lib/adaptation-plans/narrative";

type Props = {
  surveyId: number;
  currentBand: LahrBandId;
  estimation: AdaptationPlanSet | null | undefined;
  /** Auto-generate on mount if no estimation exists yet. */
  autoGenerateIfMissing?: boolean;
  /** ISO string of the last time the survey was modified. Used to flag a stale plan. */
  surveyUpdatedAt?: string | null;
  /** Bubble new estimations up so a parent can share them across siblings (e.g. report tab vs.
   *  overview tab) and avoid redundant regenerations. */
  onEstimationChange?: (next: AdaptationPlanSet | null) => void;
  /** The organisation's active schedule of rates, so a plan priced by a superseded version can say so. */
  activeRateCard?: { id: string; version: number; label: string } | null;
  /** A finalised case is read-only: no auto-generate, no regenerate button. The server
   *  enforces this too (409) — this only avoids firing a request that would be refused. */
  locked?: boolean;
  /** Parent owns a regen in flight (e.g. user landed mid-job from a refresh). When true the
   *  component renders the loading state and ignores its own estimation prop. */
  forceLoading?: boolean;
};

/** "2026-04-01" -> "Apr 2026" — the schedule-of-rates version, not a precise date. */
function formatEffectiveFrom(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const DIFFICULTY_COLOR: Record<string, string> = {
  minor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  major: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function CostEstimationRows({
  surveyId,
  currentBand,
  estimation: initialEstimation,
  autoGenerateIfMissing = true,
  surveyUpdatedAt = null,
  onEstimationChange,
  activeRateCard = null,
  locked = false,
  forceLoading = false,
}: Props) {
  const [estimation, _setEstimation] = useState<
    AdaptationPlanSet | null | undefined
  >(initialEstimation);
  // Keep parent in sync. When parent's prop later changes (e.g. sibling tab regenerated and
  // pushed up), an effect below seeds the local state from it.
  const setEstimation = useCallback(
    (next: AdaptationPlanSet | null | undefined) => {
      _setEstimation(next);
      if (next !== undefined) onEstimationChange?.(next);
    },
    [onEstimationChange],
  );
  // If the parent's prop updates after mount (sibling pushed a new plan), reflect it locally
  // so this view never shows a stale snapshot when the user comes back to this tab.
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
        throw new Error(payload?.error ?? "Re-estimate failed");
      }
      if (payload?.applicable === false) {
        setEstimation(null);
        return;
      }
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

  if (currentBand === "A") return null;

  const surveyStale =
    !!estimation &&
    !!surveyUpdatedAt &&
    new Date(surveyUpdatedAt).getTime() >
      new Date(estimation.generatedAt).getTime();
  // Both ids must be present: the built-in national fallback has no id, and the plan's FK is
  // ON DELETE SET NULL, so a null on either side means "provenance unknown", not "stale".
  const rateCardStale =
    !!estimation?.rateCardId &&
    !!activeRateCard?.id &&
    estimation.rateCardId !== activeRateCard.id;
  const isStale = surveyStale || rateCardStale;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <PoundSterling size={18} className="text-primary" />
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Adaptation Plans
            </h2>
            <p className="text-[11px] text-slate-500 m-0">
              Three funded tiers under the £30,000 Disabled Facilities Grant
              cap. Click a row for the detailed plan.
            </p>
            {estimation && (
              <p className="text-[10px] text-slate-400 m-0 mt-0.5">
                Priced from: {estimation.rateCardLabel}
                {estimation.rateCardEffectiveFrom
                  ? ` (${formatEffectiveFrom(estimation.rateCardEffectiveFrom)})`
                  : ""}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={reEstimate}
          disabled={isRefreshing || locked}
          title={
            locked
              ? "This assessment is finalised. Reopen it to a draft to regenerate the plan."
              : undefined
          }
          className={`pdf-hide inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 ${
            isStale
              ? "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
              : "border-green-300 bg-green-50 text-primary-dark hover:bg-green-100"
          }`}
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing
            ? "Estimating…"
            : isStale
              ? "Update plan"
              : estimation
                ? "Re-estimate"
                : "Generate"}
        </button>
      </header>

      {isStale && (
        <div className="mb-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {surveyStale && rateCardStale
              ? "The survey was edited and the schedule of rates has moved on since this plan was generated."
              : surveyStale
                ? "The survey was edited after this plan was generated."
                : `This plan was priced from ${estimation?.rateCardLabel}. Your organisation has since published ${activeRateCard?.label} (version ${activeRateCard?.version}).`}{" "}
            Click <em>Update plan</em> to re-price it. Prices never change on their own.
          </span>
        </div>
      )}

      {error && (
        <div className="pdf-hide rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 mb-3">
          {error}
        </div>
      )}

      {forceLoading || isRefreshing ? (
        <EmptyState isLoading={true} locked={locked} />
      ) : !estimation ? (
        <EmptyState isLoading={false} locked={locked} />
      ) : (
        <ul className="space-y-2">
          {estimation.tiers.map((tier) => (
            <TierRow
              key={tier.budgetGbp}
              tier={tier}
              currentBand={currentBand}
              surveyId={surveyId}
            />
          ))}
        </ul>
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
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-200 py-8 text-center text-[12px] text-slate-500">
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin text-primary" />
          <span>Generating adaptation plan — this can take 30–60 seconds.</span>
        </>
      ) : (
        <span>
          {locked
            ? "No adaptation plan was generated before this assessment was finalised."
            : "Adaptation plan not generated yet. Click Generate above."}
        </span>
      )}
    </div>
  );
}

function TierRow({
  tier,
  currentBand,
  surveyId,
}: {
  tier: TierPlan;
  currentBand: LahrBandId;
  surveyId: number;
}) {
  const uplifted = tier.potentialBand !== currentBand;
  const diffClass =
    DIFFICULTY_COLOR[tier.overallDifficulty] ?? DIFFICULTY_COLOR.minor;
  const isCap = tier.budgetGbp === 30000;
  const bandColor = LAHR_BAND_BY_ID[tier.potentialBand].color;
  const isEmpty = tier.lines.length === 0;

  return (
    <li>
      <Link
        href={`/cases/${surveyId}/cost-estimation/${tier.budgetGbp}`}
        className={`group flex flex-col gap-3 rounded-lg border p-3 transition-colors hover:border-green-300 hover:bg-green-50/40 sm:flex-row sm:items-center ${
          isCap
            ? "border-green-200 bg-green-50/20"
            : "border-slate-200 bg-white"
        }`}
      >
        {/* Budget — always shown so the user can see which tier this row represents. */}
        <div className="shrink-0 sm:w-[110px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Budget
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-900">
              £{(tier.budgetGbp / 1000).toFixed(0)}K
            </span>
            {isCap && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                DFG cap
              </span>
            )}
          </div>
        </div>

        {isEmpty ? (
          /* Empty tier: just the reason. No projected-band, no spend, no difficulty —
             those would imply a plan that doesn't exist. */
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              No adaptation available
            </div>
            <div
              className="text-sm text-amber-800 truncate"
              title={tier.unavailableReason ?? undefined}
            >
              {tier.unavailableReason ??
                "No feasible adaptation fits this budget for this property."}
            </div>
          </div>
        ) : (
          <>
            {/* Stats wrap into a grid below sm; from sm they resume the original fixed columns. */}
            <div className="grid flex-1 grid-cols-2 gap-3 sm:contents">
            {/* Projected band */}
            <div className="min-w-0 sm:w-[140px] sm:shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Projected band
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: bandColor }}
                >
                  {tier.potentialBand}
                </span>
                {uplifted ? (
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    ↑ from {currentBand}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">same</span>
                )}
              </div>
            </div>

            {/* Spend */}
            <div className="min-w-0 sm:w-[90px] sm:shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Spend
              </div>
              <div className="text-sm font-bold text-slate-800">
                {formatCostRange(tier.totalCost)}
              </div>
              {tier.totalCost.lowGbp !== tier.totalCost.highGbp && (
                <div className="text-[10px] text-slate-400">
                  £{tier.totalCost.expectedGbp.toLocaleString()} expected
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div className="min-w-0 sm:w-[110px] sm:shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Difficulty
              </div>
              <span
                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${diffClass}`}
              >
                {tier.overallDifficulty}
              </span>
            </div>

            {/* Adaptation list summary */}
            <div className="col-span-2 min-w-0 sm:flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Adaptations
              </div>
              <div className="text-sm text-slate-700 truncate">
                {`${tier.lines.length} · ${tier.lines.map((line) => line.label).join(", ")}`}
              </div>
            </div>
            </div>
          </>
        )}

        <ChevronRight
          size={18}
          className="hidden shrink-0 text-slate-400 group-hover:text-primary sm:block"
        />
      </Link>
    </li>
  );
}
