import { Skeleton } from "@/app/components/property-check/ui";

/**
 * Shaped like the real overview — four summary cards, two charts, a row of case cards —
 * so the page does not jump as the data arrives.
 */
export default function DashboardLoading() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white px-4 py-7 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading assessment overview"
    >
      <div className="mx-auto max-w-[1500px]">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-3 w-28" />
              <Skeleton className="mt-2 h-7 w-14" />
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          {Array.from({ length: 2 }).map((_, index) => (
            <section key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-2 h-3 w-56 max-w-full" />
              <Skeleton className="mt-5 h-52 w-full rounded-xl" />
            </section>
          ))}
        </div>

        <section className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
