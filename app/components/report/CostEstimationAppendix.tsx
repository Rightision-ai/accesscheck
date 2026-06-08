"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { LAHR_BAND_BY_ID, type LahrBandId } from "@/lib/accessibility/lahr/types";
import LahrBandBadge from "@/app/components/common/LahrBandBadge";
import type {
  CostEstimation,
  DfgBudgetGbp,
  TierPlan,
} from "@/lib/accessibility/cost-estimation/types";
import { pollCostEstimation } from "@/lib/accessibility/cost-estimation/client";

type Props = {
  surveyId: number;
  estimation: CostEstimation | null | undefined;
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
  onEstimationChange?: (next: CostEstimation | null) => void;
  /** Notifies the parent whenever the internal POST-then-poll loop starts/stops. Used by the
   *  report's reassess flow to keep the page-level overlay up until the DFG regen finishes. */
  onRefreshingChange?: (isRefreshing: boolean) => void;
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
  forceLoading = false,
}: Props) {
  const [estimation, _setEstimation] = useState<CostEstimation | null | undefined>(
    initialEstimation,
  );
  const setEstimation = useCallback(
    (next: CostEstimation | null | undefined) => {
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

  const isStale =
    !!estimation &&
    (inputsDirty ||
      (!!surveyUpdatedAt &&
        new Date(surveyUpdatedAt).getTime() > new Date(estimation.generatedAt).getTime()));

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-primary-dark">
            DFG Adoption Plan
          </h2>
          <p className="text-[11px] text-slate-500">
            UK Disabled Facilities Grant funding caps at £30,000. Three tiers below show
            what can be achieved at £15K, £20K, and £30K of spend.
          </p>
        </div>
        {enableReEstimate && (
          <button
            type="button"
            onClick={reEstimate}
            disabled={isRefreshing}
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
          {inputsDirty
            ? "Form inputs have changed. Save the report and click Update plan to regenerate the DFG plan against the latest measurements."
            : (
                <>
                  The survey was edited after this plan was generated. Click <em>Update plan</em>{" "}
                  to refresh it with the latest measurements.
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
        <EmptyState isLoading={true} />
      ) : !estimation ? (
        <EmptyState isLoading={false} />
      ) : (
        <>
          <SummaryRow estimation={estimation} currentBand={currentBand} />
          <div className="grid gap-4 md:grid-cols-3">
            {estimation.tiers.map((tier) => (
              <TierCard
                key={tier.budgetGbp}
                tier={tier}
                currentBand={currentBand}
                isCap={tier.budgetGbp === 30000}
              />
            ))}
          </div>
          <NarrativeBlock estimation={estimation} />
        </>
      )}
    </div>
  );
}

function EmptyState({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-green-200 bg-green-50/40 py-10 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Loader2 size={40} className="relative z-[1] animate-spin text-primary" />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary"
          />
        </div>
        <div>
          <h4 className="m-0 text-base font-extrabold text-primary-dark">
            Generating adoption plan…
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            The Disabled Facilities Grant tiers are being recalculated. This usually finishes in
            40–60 seconds.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-slate-200 py-10 text-[12px] text-slate-500">
      <span>Adoption plan not generated yet.</span>
      {(
        <span className="text-[11px] text-slate-400">
          Use the button above to generate one for this property.
        </span>
      )}
    </div>
  );
}

function SummaryRow({
  estimation,
  currentBand,
}: {
  estimation: CostEstimation;
  currentBand: LahrBandId;
}) {
  const at30k = estimation.tiers.find((t) => t.budgetGbp === 30000);
  const reachesA = estimation.reachesBandAAt30k;

  return (
    <section className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div className="flex flex-col items-start gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Current band
        </span>
        <LahrBandBadge band={currentBand} size="sm" showLabel={false} />
      </div>
      <div className="hidden h-px bg-gradient-to-r from-slate-200 via-green-300 to-slate-200 md:block" />
      <div className="flex flex-col items-start gap-1 md:items-end">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Potential band at £30K
        </span>
        <div className="flex items-center gap-3">
          {at30k && <LahrBandBadge band={at30k.potentialBand} size="sm" showLabel={false} />}
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
  const diffColor = DIFFICULTY_COLOR[tier.overallDifficulty] ?? DIFFICULTY_COLOR.minor;
  const isEmpty = tier.adaptations.length === 0;

  return (
    <article
      className={`pdf-avoid-break flex flex-col gap-3 rounded border p-4 ${
        isCap ? "border-green-300 bg-green-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <header className="flex items-baseline justify-between border-b border-slate-200 pb-2">
        <h3 className="text-sm font-extrabold text-slate-900">
          £{tier.budgetGbp.toLocaleString()}
        </h3>
        {isCap && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            DFG cap
          </span>
        )}
      </header>

      {/* Stats and projected band only render when a plan exists. Empty tiers show just the
          "No adoption" reason — hiding stats avoids implying a £0 plan that uplifts the band. */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat label="Spend" value={`£${tier.totalCostGbp.toLocaleString()}`} />
            <Stat label="Difficulty" value={tier.overallDifficulty} valueClass={diffColor} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Projected band
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: LAHR_BAND_BY_ID[tier.potentialBand].color }}
            >
              {tier.potentialBand}
            </span>
            {uplifted && (
              <span className="text-[10px] text-emerald-700">
                ↑ from {currentBand}
              </span>
            )}
          </div>
        </>
      )}

      {isEmpty ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
          <div className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mb-1">
            No adoption available
          </div>
          <p className="m-0">
            {tier.unavailableReason ??
              "No feasible adaptation fits within this tier for this property. Consider the next tier."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 text-[11px] text-slate-700">
          {tier.adaptations.map((a, i) => (
            <li key={i} className="pdf-avoid-break rounded border border-slate-100 bg-white p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-800">{a.label}</span>
                <span className="shrink-0 text-slate-600">
                  £{a.costGbp.toLocaleString()}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Addresses Accessible Housing Rules rule{a.addressesRules.length > 1 ? "s" : ""}{" "}
                {a.addressesRules.join(", ")} · {a.trades.join(", ") || "general"}
              </div>
              {a.narrative && (
                <p className="mt-1 text-[10px] italic text-slate-600">{a.narrative}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {tier.droppedCandidates.length > 0 && <DroppedList dropped={tier.droppedCandidates} />}
    </article>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border border-slate-100 bg-white py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-[12px] font-extrabold text-slate-800 ${valueClass ?? ""}`}>
        {value}
      </div>
    </div>
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
            <span className="font-semibold text-slate-700">{d.label}</span> — {d.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}

function NarrativeBlock({ estimation }: { estimation: CostEstimation }) {
  const confidencePct = Math.round(estimation.confidence * 100);
  return (
    <section className="space-y-3 rounded border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-700">
      <p>{estimation.overallNarrative}</p>
      {estimation.rationaleIfNotBandA && (
        <p className="text-slate-600">
          <span className="font-semibold">Gap to band A:</span>{" "}
          {estimation.rationaleIfNotBandA}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Confidence
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-primary"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-slate-600">{confidencePct}%</span>
      </div>
      <p className="text-[10px] text-slate-400">
        Generated {new Date(estimation.generatedAt).toLocaleString()} · AI engine
      </p>
    </section>
  );
}
