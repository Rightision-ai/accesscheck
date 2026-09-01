import { Skeleton } from "@/app/components/property-check/ui";

/** Header, filter bar and a page of case cards, in the positions they will occupy. */
export default function AssessmentsLoading() {
  return (
    <div
      className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading assessments"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-8 w-56" />
      <Skeleton className="mt-2 h-3 w-80 max-w-full" />

      <div className="mt-6 mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_160px_auto]">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-4 h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
