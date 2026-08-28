import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import { buildAssessmentSummary, buildWeeklyTrend, type AssessmentAnalyticsRow } from "@/lib/assessments/analytics";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(); defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = typeof params.from === "string" ? params.from : defaultFrom.toISOString().slice(0, 10);
  const db = asLooseClient(await createClient());
  const result = await db.from("surveys").select("id,created_at,updated_at,completed_at,status,assessment_readiness,overall_grade").eq("organisation_id", context.organisationId).gte("created_at", from).lte("created_at", `${to}T23:59:59.999Z`);
  const rows = (result.data ?? []) as AssessmentAnalyticsRow[];
  const summary = buildAssessmentSummary(rows);
  const trend = buildWeeklyTrend(rows);
  const gradeDistribution = rows.reduce<Record<string, number>>((counts, row) => { const grade = row.overall_grade || "Not recorded"; counts[grade] = (counts[grade] ?? 0) + 1; return counts; }, {});
  const maxTrend = Math.max(1, ...trend.flatMap((week) => [week.started, week.completed]));
  const exportParams = new URLSearchParams({ from, to, format: "csv" });

  return <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Organisation analytics</p><h1 className="mt-1 text-3xl font-extrabold text-slate-950">Assessment reports</h1><p className="mt-1 text-sm text-slate-500">Understand assessment volume, turnaround and evidence quality.</p></div><Link href={`/api/reports/assessments?${exportParams}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><Download size={17} /> Export CSV</Link></div>
    <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"><label className="text-xs font-bold text-slate-600">From<input type="date" name="from" defaultValue={from} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">To<input type="date" name="to" defaultValue={to} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal" /></label><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Update</button></form>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Assessments</p><p className="mt-2 text-3xl font-extrabold">{summary.total}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Completed</p><p className="mt-2 text-3xl font-extrabold">{summary.complete}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Evidence ready</p><p className="mt-2 text-3xl font-extrabold">{summary.readiness.ready}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Median completion</p><p className="mt-2 text-3xl font-extrabold">{summary.medianCompletionDays == null ? "—" : `${Math.round(summary.medianCompletionDays)}d`}</p></div></section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-950">Assessment volume</h2><p className="mb-5 text-sm text-slate-500">Started and completed by week</p><div className="flex h-56 items-end gap-2">{trend.map((week) => <div key={week.week} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="flex h-44 w-full items-end justify-center gap-1"><div className="w-2/5 rounded-t bg-primary/25" style={{ height: `${Math.max(3, week.started / maxTrend * 100)}%` }} /><div className="w-2/5 rounded-t bg-primary" style={{ height: `${Math.max(3, week.completed / maxTrend * 100)}%` }} /></div><span className="text-[10px] text-slate-400">{new Date(week.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-950">Accessibility outcomes</h2><p className="mb-5 text-sm text-slate-500">Recorded assessment bands</p><div className="space-y-3">{Object.entries(gradeDistribution).sort().map(([grade, count]) => <div key={grade} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-semibold text-slate-700">{grade}</span><span className="font-extrabold text-slate-950">{count}</span></div>)}{Object.keys(gradeDistribution).length === 0 && <p className="text-sm text-slate-500">No outcomes in this period.</p>}</div></section></div>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-950">Workflow quality</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Awaiting review</p><p className="mt-1 text-2xl font-extrabold">{summary.review}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Partially ready</p><p className="mt-1 text-2xl font-extrabold">{summary.readiness.partial}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Missing evidence</p><p className="mt-1 text-2xl font-extrabold">{summary.readiness.incomplete}</p></div></div></section>
  </div>;
}
