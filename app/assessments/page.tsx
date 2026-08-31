import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import { mapSurveyToCase } from "@/lib/surveys/mapper";
import { signStorageRefsDeep } from "@/lib/storage/signing";
import { ASSESSMENT_STATUS_META, ASSESSMENT_STATUSES } from "@/lib/assessments/status";
import type { AssessmentStatus } from "@/types/accesscheck";
import type { Case } from "@/types/dashboard";
import AssessmentsClient from "./AssessmentsClient";

const PAGE_SIZE = 10;

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const statusParam = typeof params.status === "string" ? (params.status as AssessmentStatus) : null;
  const status = statusParam && ASSESSMENT_STATUSES.includes(statusParam) ? statusParam : null;
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number(params.page ?? 1));

  const db = asLooseClient(await createClient());
  // Select * because the cards need thumbnail_url and resuming a draft needs raw_ai_data.
  let query = db
    .from("surveys")
    .select("*", { count: "exact" })
    .eq("organisation_id", context.organisationId);
  if (status) query = query.eq("status", status);
  if (search) {
    const safe = search.replace(/[(),]/g, " ");
    query = query.or(
      `street.ilike.%${safe}%,postcode.ilike.%${safe}%,inspector_name.ilike.%${safe}%,uprn.ilike.%${safe}%`,
    );
  }
  const result = await query
    .order("updated_at", { ascending: sort === "oldest" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const rows = (result.data ?? []) as Array<Record<string, unknown>>;
  // One batched signing pass for the whole page of cards rather than per row.
  const cases: Case[] = await signStorageRefsDeep(rows.map((row) => mapSurveyToCase(row)));
  const total = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canAuthor =
    context.isPlatformAdmin ||
    context.permissions.includes("author") ||
    context.permissions.includes("admin");

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Assessment workflow</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, resume and review council accessibility assessments.
          </p>
        </div>
        {canAuthor && (
          <Link
            href="/assessments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={18} /> New assessment
          </Link>
        )}
      </div>

      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_160px_auto]">
        <label className="relative">
          <span className="sr-only">Search assessments</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Address, postcode, reference or applicant"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">All statuses</option>
          {ASSESSMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ASSESSMENT_STATUS_META[value].label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="newest">Recently updated</option>
          <option value="oldest">Oldest updated</option>
        </select>
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
          Apply
        </button>
      </form>

      {result.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="font-bold text-red-900">Could not load assessments</h2>
          <p className="mt-1 text-sm text-red-700">{result.error.message}</p>
        </div>
      ) : (
        <AssessmentsClient
          cases={cases}
          total={total}
          page={page}
          pages={pages}
          pageSize={PAGE_SIZE}
          canAuthor={canAuthor}
        />
      )}
    </div>
  );
}
