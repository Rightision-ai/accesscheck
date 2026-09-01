import { Skeleton, SkeletonCard } from "@/app/components/property-check/ui";

/**
 * A case pulls its survey, adaptation plans, rate card and signed evidence URLs before it
 * can render, so this is the boundary users wait at most often.
 */
export default function CaseLoading() {
  return (
    <div
      className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading case"
    >
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-80 max-w-full" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
        <div className="space-y-5">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={6} />
        </div>
      </div>
    </div>
  );
}
