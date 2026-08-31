"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * Client-side pager for lists that are already fully loaded. `pending` comes
 * from the caller's `useTransition`, so the spinner reflects React actually
 * still rendering the new page rather than an invented delay.
 */
/** First page, last page, and a window around the current one — with gaps marked. */
function pageNumbers(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const window = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((number) => window.add(number));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((number) => window.add(number));
  const shown = [...window].filter((number) => number >= 1 && number <= pageCount).sort((a, b) => a - b);
  return shown.flatMap((number, index) =>
    index > 0 && number - shown[index - 1] > 1 ? (["gap", number] as Array<number | "gap">) : [number],
  );
}

export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  pending,
  onChange,
  label = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  pending: boolean;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
      <p className="m-0 flex items-center gap-2 text-[11px] text-slate-500">
        Showing {first}–{last} of {total} {label}
        {pending && <Loader2 size={12} className="animate-spin text-primary" aria-label="Loading" />}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1 || pending}
          aria-label="Previous page"
          className="inline-flex items-center rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers(page, pageCount).map((number, index) =>
          number === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-[11px] text-slate-400">
              …
            </span>
          ) : (
          <button
            key={number}
            type="button"
            onClick={() => onChange(number)}
            disabled={pending}
            aria-current={number === page ? "page" : undefined}
            className={`min-w-7 rounded-md border px-2 py-1 text-[11px] font-bold disabled:opacity-60 ${
              number === page
                ? "border-primary bg-primary-light text-primary"
                : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
            }`}
          >
            {number}
          </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount || pending}
          aria-label="Next page"
          className="inline-flex items-center rounded-md border border-slate-200 p-1.5 text-slate-600 hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
