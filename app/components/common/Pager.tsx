"use client";

import React from "react";

/** Page numbers with ellipsis: 1 … 4 5 6 … 20 */
export function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

/**
 * Numbered pager shared by the survey-priority table and the assessments list. Callers
 * decide what a page change means — client-side slicing or a `?page=` navigation.
 */
export default function Pager({
  current,
  pageCount,
  total,
  pageSize,
  onChange,
  className,
}: {
  current: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className ?? ""}`}>
      <span className="text-xs text-slate-500">
        {total === 0
          ? "Nothing to show"
          : `Showing ${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary disabled:opacity-40"
        >
          ‹
        </button>
        {pageNumbers(current, pageCount).map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-2 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              type="button"
              key={n}
              aria-current={n === current ? "page" : undefined}
              onClick={() => onChange(n)}
              className={`min-w-8 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                n === current
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-slate-700 hover:border-primary"
              }`}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onChange(current + 1)}
          disabled={current >= pageCount}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
