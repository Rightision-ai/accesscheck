"use client";

import { useMemo, useState, useTransition } from "react";
import type { RateCard } from "@/lib/rate-cards/types";
import { formatCostRange } from "@/lib/adaptation-plans/narrative";
import Pagination from "@/app/components/settings/Pagination";

const PAGE_SIZE = 15;

const DIFFICULTY_COLOR: Record<string, string> = {
  minor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  major: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Least disruptive first — the order a surveyor reads a schedule of rates in. */
const DIFFICULTY_ORDER: Record<string, number> = {
  minor: 1,
  moderate: 2,
  major: 3,
};

export default function RateCardTable({ rateCard }: { rateCard: RateCard }) {
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();

  // Sorted for display only. The engine trims its candidate pool by `priorityHint`, which it
  // reads off each item directly, so it is unaffected by the order here.
  const items = useMemo(
    () =>
      [...rateCard.items].sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.difficulty] ?? 99) -
            (DIFFICULTY_ORDER[b.difficulty] ?? 99) ||
          a.rateExpectedGbp - b.rateExpectedGbp ||
          a.workItemCode.localeCompare(b.workItemCode),
      ),
    [rateCard.items],
  );

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // Clamp: publishing a new version can shrink the list under the current page.
  const currentPage = Math.min(page, pageCount);
  const visible = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Schedule of rates</h2>
          <p className="mt-1 text-sm text-slate-500">
            The prices behind every adaptation plan. The engine chooses a work
            item and a quantity; the cost, duration and trades all come from
            here.
          </p>
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-slate-800">
            {rateCard.label}
          </div>
          <div className="text-[11px] text-slate-500">
            {rateCard.version !== null && `v${rateCard.version} · `}
            {rateCard.items.length} work items · effective{" "}
            {rateCard.effectiveFrom}
            {rateCard.regionMultiplier !== 1
              ? ` · ×${rateCard.regionMultiplier} region multiplier`
              : ""}
          </div>
        </div>
      </header>

      <div className={`mt-4 overflow-x-auto transition-opacity ${pending ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Work item</th>
              <th className="py-2 pr-3">Unit</th>
              <th className="py-2 pr-3">Cost range</th>
              <th className="py-2 pr-3">Expected</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr
                key={item.workItemCode}
                className="border-b border-slate-100 align-top"
              >
                <td className="py-2.5 pr-3">
                  <div className="font-semibold text-slate-800">
                    {item.description}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.workItemCode}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        rateCard.ownedCardId !== null &&
                        item.rateCardId === rateCard.ownedCardId
                          ? "border-primary/30 bg-primary/10 text-primary-dark"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {rateCard.ownedCardId !== null &&
                      item.rateCardId === rateCard.ownedCardId
                        ? "Your rate"
                        : "AccessCheck"}
                    </span>
                  </div>
                  {item.preconditions && (
                    <div className="mt-0.5 text-[11px] italic text-slate-500">
                      {item.preconditions}
                    </div>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">{item.unit}</td>
                <td className="py-2.5 pr-3 font-semibold text-slate-800">
                  {formatCostRange({
                    lowGbp: item.rateLowGbp,
                    expectedGbp: item.rateExpectedGbp,
                    highGbp: item.rateHighGbp,
                  })}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  £{item.rateExpectedGbp.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  {item.durationDaysLow === item.durationDaysHigh
                    ? `${item.durationDaysExpected}d`
                    : `${item.durationDaysLow}–${item.durationDaysHigh}d`}
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                      DIFFICULTY_COLOR[item.difficulty] ??
                      DIFFICULTY_COLOR.minor
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

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={items.length}
        pageSize={PAGE_SIZE}
        pending={pending}
        onChange={(next) => startTransition(() => setPage(next))}
        label="work items"
      />

      <footer className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <p className="m-0">
          Rows marked <span className="font-bold">AccessCheck</span> are indicative figures your
          organisation has not priced — confirm them against a quote before commissioning
          works.
        </p>
        <p className="m-0">
          Publishing a schedule of rates above overrides any of them. Anything you do not price
          keeps its AccessCheck figure.
        </p>
      </footer>
    </section>
  );
}
