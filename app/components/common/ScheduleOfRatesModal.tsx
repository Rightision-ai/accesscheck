"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Loader2, X } from "lucide-react";

type RateLine = {
  workItemCode: string;
  description: string;
  unit: string;
  rateLowGbp: number;
  rateExpectedGbp: number;
  rateHighGbp: number;
  durationDaysExpected: number;
  difficulty: string;
  sourceLabel: string;
  isOwn: boolean;
};

type Payload = {
  label: string;
  version: number | null;
  effectiveFrom: string;
  regionMultiplier: number;
  ownedCardId: string | null;
  items: RateLine[];
};

interface Props {
  /** Open when set. `cardId: null` is a plan priced by the AccessCheck estimation alone. */
  open: boolean;
  cardId: string | null;
  /** The label stored on the plan, shown while the lines load. */
  fallbackLabel: string;
  onClose: () => void;
}

const gbp = (value: number) => `£${Math.round(value).toLocaleString("en-GB")}`;

const DIFFICULTY_COLOR: Record<string, string> = {
  minor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  major: "bg-rose-50 text-rose-700 border-rose-200",
};

/**
 * The rates behind a plan, as the version that priced it held them.
 *
 * Opened from the provenance block on a plan rather than linking to settings: "priced from
 * what?" is a question about *this* plan, and the settings page only ever shows the rates in
 * force today — which is the wrong answer whenever the plan was priced by a superseded version.
 *
 * Portalled to <body> so it escapes the stacking and overflow contexts of the case tabs, and
 * fetched on open so the case page does not carry lines nobody asked for.
 */
export default function ScheduleOfRatesModal({
  open,
  cardId,
  fallbackLabel,
  onClose,
}: Props) {
  const [payload, setPayload] = React.useState<Payload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
    fetch(`/api/rate-cards/items${query}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Could not load these rates.");
        return body as Payload;
      })
      .then((body) => {
        if (!cancelled) setPayload(body);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // A second open for a different version must not render the first one's lines.
    return () => {
      cancelled = true;
    };
  }, [open, cardId]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const ownCount = payload?.items.filter((item) => item.isOwn).length ?? 0;

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule of rates that priced this plan"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-base font-bold text-slate-900">
              Schedule of rates
            </h2>
            <p className="m-0 mt-0.5 truncate text-sm font-semibold text-slate-700">
              {payload?.label ?? fallbackLabel}
            </p>
            <p className="m-0 mt-0.5 text-[11px] text-slate-500">
              {payload ? (
                <>
                  {payload.version !== null && `v${payload.version} · `}
                  {payload.items.length} work item
                  {payload.items.length === 1 ? "" : "s"} · effective{" "}
                  {payload.effectiveFrom}
                  {payload.regionMultiplier !== 1 &&
                    ` · ×${payload.regionMultiplier} region multiplier`}
                </>
              ) : (
                "The rates this plan was priced from."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading rates…
            </div>
          )}

          {error && !loading && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}

          {payload && !loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Work item</th>
                    <th className="py-2 pr-3">Expected</th>
                    <th className="py-2 pr-3">Range</th>
                    <th className="py-2 pr-3">Days</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.items.map((item) => (
                    <tr
                      key={item.workItemCode}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-slate-800">
                          {item.description}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {item.workItemCode} · per {item.unit}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-semibold text-slate-900">
                        {gbp(item.rateExpectedGbp)}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {gbp(item.rateLowGbp)}–{gbp(item.rateHighGbp)}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {item.durationDaysExpected}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            item.isOwn
                              ? "border-primary/30 bg-primary/10 text-primary-dark"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {item.isOwn ? "Your rate" : "AccessCheck"}
                        </span>
                        <span
                          className={`ml-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            DIFFICULTY_COLOR[item.difficulty] ??
                            "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500">
          <span>
            {payload && ownCount === 0
              ? "Every line is an AccessCheck estimate — confirm against a quote before commissioning works."
              : payload
                ? `${ownCount} of ${payload.items.length} lines are your organisation's own rates; the rest are AccessCheck estimates.`
                : ""}
          </span>
          <Link
            href="/settings/schedule-of-rates"
            className="font-bold text-primary-dark hover:underline"
          >
            Rates in force today →
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
