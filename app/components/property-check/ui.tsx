/** Lightweight presentational primitives shared across the Property Check screens. */
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

/** A single pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-200', className)} />;
}

/** A skeleton card shaped like a content Section (title + a few lines). */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton rows for a table body. Render inside <tbody>. */
export function SkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-3" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A small inline spinner (Tailwind-only, no icon import needed). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary', className)}
      aria-label="Loading"
    />
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  auto_assessable: 'bg-green-100 text-green-800',
  exterior_only: 'bg-blue-100 text-blue-800',
  data_enriched_only: 'bg-amber-100 text-amber-800',
  needs_manual_survey: 'bg-orange-100 text-orange-800',
  no_useful_evidence: 'bg-rose-100 text-rose-800',
  // job/item statuses
  completed: 'bg-green-100 text-green-800',
  completed_with_errors: 'bg-amber-100 text-amber-800',
  running: 'bg-blue-100 text-blue-800',
  queued: 'bg-slate-100 text-slate-700',
  failed: 'bg-rose-100 text-rose-800',
  done: 'bg-green-100 text-green-800',
  pending: 'bg-slate-100 text-slate-700',
  processing: 'bg-blue-100 text-blue-800',
};

export function Badge({ value, label }: { value: string | null; label?: string }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;
  const style = STATUS_STYLES[value] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', style)}>
      {label ?? value.replace(/_/g, ' ')}
    </span>
  );
}

export function Bool({ value }: { value: boolean }) {
  return value ? (
    <span className="text-green-600 font-semibold text-xs">Yes</span>
  ) : (
    <span className="text-slate-400 text-xs">No</span>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Confidence({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400 text-xs">—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-green-700' : pct >= 45 ? 'text-amber-700' : 'text-rose-700';
  return <span className={cn('text-xs font-bold', color)}>{pct}%</span>;
}
