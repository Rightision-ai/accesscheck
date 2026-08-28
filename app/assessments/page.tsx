import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import type { AssessmentStatus } from "@/types/accesscheck";

const statusLabels: Record<AssessmentStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "Review",
  complete: "Complete",
};

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const status = typeof params.status === "string" ? params.status as AssessmentStatus : null;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 25;
  const db = asLooseClient(await createClient());
  let query = db
    .from("surveys")
    .select("id,updated_at,status,door_number,street_number,building_name,street,postcode,inspector_name,inspection_date,overall_grade,assessment_completion_percent,assessment_readiness", { count: "exact" })
    .eq("organisation_id", context.organisationId);
  if (status && status in statusLabels) query = query.eq("status", status);
  if (search) {
    const safe = search.replace(/[(),]/g, " ");
    query = query.or(`street.ilike.%${safe}%,postcode.ilike.%${safe}%,inspector_name.ilike.%${safe}%,uprn.ilike.%${safe}%`);
  }
  const result = await query.order("updated_at", { ascending: sort === "oldest" }).range((page - 1) * pageSize, page * pageSize - 1);
  const assessments = (result.data ?? []) as Array<Record<string, unknown>>;
  const total = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefForPage = (target: number) => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (status) next.set("status", status);
    if (sort !== "newest") next.set("sort", sort);
    next.set("page", String(target));
    return `/assessments?${next}`;
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">Assessment workflow</p><h1 className="mt-1 text-3xl font-extrabold text-slate-950">Assessments</h1><p className="mt-1 text-sm text-slate-500">Search, resume and review council accessibility assessments.</p></div>
        {(context.isPlatformAdmin || context.permissions.includes("author")) && <Link href="/assessments/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"><Plus size={18} /> New assessment</Link>}
      </div>

      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_160px_auto]">
        <label className="relative"><span className="sr-only">Search assessments</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="search" defaultValue={search} placeholder="Address, postcode, reference or applicant" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" /></label>
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="sort" defaultValue={sort} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="newest">Recently updated</option><option value="oldest">Oldest updated</option></select>
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Apply</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-500">{total} assessment{total === 1 ? "" : "s"}</div>
        {assessments.length === 0 ? <div className="p-14 text-center"><h2 className="font-bold text-slate-900">No assessments found</h2><p className="mt-1 text-sm text-slate-500">Change the filters or create a new assessment.</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Property</th><th className="px-5 py-3">Inspector</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Readiness</th><th className="px-5 py-3">Band</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-slate-100">
            {assessments.map((assessment) => {
              const assessmentStatus = assessment.status as AssessmentStatus;
              const address = [assessment.door_number, assessment.street_number, assessment.building_name, assessment.street].filter(Boolean).join(" ") || "Address pending";
              return <tr key={String(assessment.id)} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold text-slate-900">{address}</p><p className="text-xs text-slate-500">{String(assessment.postcode || "No postcode")} · #{String(assessment.id)}</p></td><td className="px-5 py-4 text-slate-600">{String(assessment.inspector_name || "Not recorded")}</td><td className="px-5 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{statusLabels[assessmentStatus] ?? assessmentStatus}</span></td><td className="px-5 py-4"><p className="font-semibold capitalize text-slate-700">{String(assessment.assessment_readiness || "incomplete")}</p><p className="text-xs text-slate-500">{Number(assessment.assessment_completion_percent || 0)}% complete</p></td><td className="px-5 py-4 font-bold text-slate-700">{String(assessment.overall_grade || "—")}</td><td className="px-5 py-4 text-slate-500">{assessment.updated_at ? new Date(String(assessment.updated_at)).toLocaleDateString("en-GB") : "—"}</td><td className="px-5 py-4 text-right"><Link href={`/cases/${assessment.id}`} className="font-bold text-primary">Open</Link></td></tr>;
            })}
          </tbody></table></div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm"><span className="text-slate-500">Page {page} of {pages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={page <= 1 ? hrefForPage(1) : hrefForPage(page - 1)} className={`rounded-lg border border-slate-200 p-2 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}><ChevronLeft size={17} /></Link><Link aria-disabled={page >= pages} href={page >= pages ? hrefForPage(pages) : hrefForPage(page + 1)} className={`rounded-lg border border-slate-200 p-2 ${page >= pages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`}><ChevronRight size={17} /></Link></div></div>
      </div>
    </div>
  );
}
