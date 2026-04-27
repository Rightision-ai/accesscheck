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
import type {
  CostEstimation,
  TierPlan,
} from "@/lib/accessibility/cost-estimation/types";
import { pollCostEstimation } from "@/lib/accessibility/cost-estimation/client";

type Props = {
  surveyId: number;
  currentBand: LahrBandId;
  estimation: CostEstimation | null | undefined;
  /** Auto-generate on mount if no estimation exists yet. */
  autoGenerateIfMissing?: boolean;
  /** ISO string of the last time the survey was modified. Used to flag a stale plan. */
  surveyUpdatedAt?: string | null;
  /** Bubble new estimations up so a parent can share them across siblings (e.g. report tab vs.
   *  overview tab) and avoid redundant regenerations. */
  onEstimationChange?: (next: CostEstimation | null) => void;
};

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
}: Props) {
  const [estimation, _setEstimation] = useState<
    CostEstimation | null | undefined
  >(initialEstimation);
  // Keep parent in sync. When parent's prop later changes (e.g. sibling tab regenerated and
  // pushed up), an effect below seeds the local state from it.
  const setEstimation = useCallback(
    (next: CostEstimation | null | undefined) => {
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
      const res = await fetch("/api/gemini/cost-estimation", {
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
      const finalEstimation = await pollCostEstimation(surveyId);
      setEstimation(finalEstimation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (
      autoGenerateIfMissing &&
      !estimation &&
      currentBand !== "A" &&
      !autoFiredRef.current &&
      !isRefreshing
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
  ]);

  if (currentBand === "A") return null;

  const isStale =
    !!estimation &&
    !!surveyUpdatedAt &&
    new Date(surveyUpdatedAt).getTime() >
      new Date(estimation.generatedAt).getTime();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <PoundSterling size={18} className="text-violet-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Adoption Plans
            </h2>
            <p className="text-[11px] text-slate-500 m-0">
              Three funded tiers under the £30,000 Disabled Facilities Grant
              cap. Click a row for the detailed plan.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reEstimate}
          disabled={isRefreshing}
          className={`pdf-hide inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 ${
            isStale
              ? "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
              : "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
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
            The survey was edited after this plan was generated. Click{" "}
            <em>Update plan</em> to refresh it with the latest measurements.
          </span>
        </div>
      )}

      {error && (
        <div className="pdf-hide rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 mb-3">
          {error}
        </div>
      )}

      {isRefreshing ? (
        <EmptyState isLoading={true} />
      ) : !estimation ? (
        <EmptyState isLoading={false} />
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

function EmptyState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-200 py-8 text-center text-[12px] text-slate-500">
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin text-violet-500" />
          <span>Generating adoption plan — this can take 30–60 seconds.</span>
        </>
      ) : (
        <span>Adoption plan not generated yet. Click Generate above.</span>
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
  const isEmpty = tier.adaptations.length === 0;

  return (
    <li>
      <Link
        href={`/cases/${surveyId}/cost-estimation/${tier.budgetGbp}`}
        className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-violet-300 hover:bg-violet-50/40 ${
          isCap
            ? "border-violet-200 bg-violet-50/20"
            : "border-slate-200 bg-white"
        }`}
      >
        {/* Budget — always shown so the user can see which tier this row represents. */}
        <div className="w-[110px] shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Budget
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-900">
              £{(tier.budgetGbp / 1000).toFixed(0)}K
            </span>
            {isCap && (
              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
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
              No adoption available
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
            {/* Projected band */}
            <div className="w-[140px] shrink-0">
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
            <div className="w-[90px] shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Spend
              </div>
              <div className="text-sm font-bold text-slate-800">
                £{tier.totalCostGbp.toLocaleString()}
              </div>
            </div>

            {/* Difficulty */}
            <div className="w-[110px] shrink-0">
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
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Adaptations
              </div>
              <div className="text-sm text-slate-700 truncate">
                {`${tier.adaptations.length} · ${tier.adaptations.map((a) => a.label).join(", ")}`}
              </div>
            </div>
          </>
        )}

        <ChevronRight
          size={18}
          className="shrink-0 text-slate-400 group-hover:text-violet-600"
        />
      </Link>
    </li>
  );
}
