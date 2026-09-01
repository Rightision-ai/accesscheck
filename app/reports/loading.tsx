import { Skeleton } from "@/app/components/property-check/ui";

/** Matches the reports page: date filters, four figures, then two analysis panels. */
export default function ReportsLoading() {
  return (
    <div
      className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading assessment reports"
    >
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-2 h-8 w-72" />
      <Skeleton className="mt-2 h-3 w-96 max-w-full" />

      <div className="mt-6 mb-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Skeleton className="h-14 w-40 rounded-xl" />
        <Skeleton className="h-14 w-40 rounded-xl" />
        <Skeleton className="mt-5 h-10 w-24 rounded-xl" />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-52 max-w-full" />
            <Skeleton className="mt-5 h-56 w-full rounded-xl" />
          </section>
        ))}
      </div>
    </div>
  );
}
