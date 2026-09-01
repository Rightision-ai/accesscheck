import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import {
  buildAssessmentSummary,
  type AssessmentAnalyticsRow,
} from "@/lib/assessments/analytics";
import { mapSurveyToCase } from "@/lib/surveys/mapper";
import { signStorageRefsDeep } from "@/lib/storage/signing";
import type { Case } from "@/types/dashboard";
import type { OrganisationPermission } from "@/types/accesscheck";
import MemberCases from "./MemberCases";

type MemberRow = {
  id: string;
  organisation_id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  created_at: string;
  last_active_at: string | null;
  organisation_member_permissions: Array<{ permission: OrganisationPermission }>;
};

const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * One member: who they are, what they are carrying, and the cases behind those numbers.
 *
 * Reached from the dashboard's team workload card and from the members list, so it is
 * admin-only for the same reason those figures are — a plain author sees only their own
 * work everywhere else in the app.
 */
export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  if (!context.isPlatformAdmin && !context.permissions.includes("admin")) redirect("/settings/profile");

  const db = asLooseClient(await createClient());
  const memberResult = await db
    .from("organisation_members")
    .select("*,organisation_member_permissions(permission)")
    .eq("id", memberId)
    .eq("organisation_id", context.organisationId)
    .maybeSingle();
  const member = memberResult.data as MemberRow | null;
  if (!member) notFound();

  // Scoped to this organisation as well as the author: a member could in principle belong
  // to more than one, and only this organisation's cases are the admin's to see.
  const casesResult = await db
    .from("surveys")
    .select("*")
    .eq("organisation_id", context.organisationId)
    .eq("user_id", member.user_id)
    .order("updated_at", { ascending: false });
  const rows = (casesResult.data ?? []) as Array<Record<string, unknown>>;
  const summary = buildAssessmentSummary(rows as unknown as AssessmentAnalyticsRow[]);
  // One batched signing pass for every card, as the dashboard and assessments list do.
  const cases: Case[] = await signStorageRefsDeep(rows.map((row) => mapSurveyToCase(row)));
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "Unnamed member";
  const permissions = member.organisation_member_permissions.map((row) => row.permission);

  const figures = [
    { label: "Total cases", value: summary.total, tone: "text-slate-900" },
    { label: "Finalised", value: summary.complete, tone: "text-emerald-700" },
    { label: "In review", value: summary.review, tone: "text-amber-700" },
    { label: "Drafts", value: summary.draft, tone: "text-slate-600" },
    {
      label: "Median completion",
      value: summary.medianCompletionDays == null ? "—" : `${Math.round(summary.medianCompletionDays)}d`,
      tone: "text-slate-900",
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/settings/members"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary"
      >
        <ArrowLeft size={16} /> All members
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-supplied storage URL, no loader config
            <img src={member.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-xl font-extrabold text-primary">
              {name[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-slate-950">{name}</h2>
            <p className="text-sm text-slate-500">
              {member.email}
              {member.job_title ? ` · ${member.job_title}` : ""}
              {member.phone ? ` · ${member.phone}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize ${
                  member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {member.status}
              </span>
              {permissions.length === 0 ? (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Viewer</span>
              ) : (
                permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-lg bg-primary-light px-2.5 py-1 text-xs font-bold capitalize text-primary"
                  >
                    {permission}
                  </span>
                ))
              )}
            </div>
          </div>
          <dl className="text-right text-xs text-slate-500">
            <dt className="font-bold uppercase tracking-wide">Joined</dt>
            <dd className="mb-2 text-slate-700">{date(member.created_at)}</dd>
            <dt className="font-bold uppercase tracking-wide">Last active</dt>
            <dd className="text-slate-700">{date(member.last_active_at)}</dd>
          </dl>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Caseload">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{figure.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${figure.tone}`}>{figure.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="mb-4 border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold">Cases</h2>
          <p className="text-sm text-slate-500">Created by {name}, most recently updated first</p>
        </div>
        <MemberCases cases={cases} memberName={name} />
      </section>
    </div>
  );
}

export const metadata = { title: "Member · AccessCheck" };
