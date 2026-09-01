"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { ASSESSMENT_STATUS_META } from "@/lib/assessments/status";
import type { MemberWorkload } from "@/lib/assessments/analytics";
import { cn } from "@/lib/utils/cn";

/**
 * Who in the organisation is carrying what — admin only.
 *
 * Each member gets one stacked bar split by status, so an admin can see at a glance both
 * the size of a person's caseload and how much of it is still unfinalised. Bars are scaled
 * against the busiest member rather than the team total, otherwise everyone but the top
 * one or two is a sliver.
 */

const SEGMENTS = [
  { key: "review", label: "In review", meta: ASSESSMENT_STATUS_META.review },
  { key: "draft", label: "Draft", meta: ASSESSMENT_STATUS_META.draft },
  { key: "complete", label: "Finalised", meta: ASSESSMENT_STATUS_META.complete },
] as const;

/** Enough rows to see the shape of the team without turning the card into a table. */
const COLLAPSED_ROWS = 6;

export default function TeamWorkloadCard({ workload }: { workload: MemberWorkload[] }) {
  const [expanded, setExpanded] = useState(false);
  const busiest = Math.max(1, ...workload.map((member) => member.total));
  const rows = expanded ? workload : workload.slice(0, COLLAPSED_ROWS);
  const hidden = workload.length - rows.length;
  const team = workload.reduce(
    (sum, member) => ({
      review: sum.review + member.review,
      draft: sum.draft + member.draft,
      complete: sum.complete + member.complete,
    }),
    { review: 0, draft: 0, complete: 0 },
  );

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Team workload">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Users size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Team workload</h2>
            <p className="text-sm text-slate-500">
              Cases finalised and still open, by the member who created them
            </p>
          </div>
        </div>
        <Link href="/settings/members" className="text-sm font-bold text-primary">
          Manage members
        </Link>
      </div>

      {workload.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No members to report on yet.
        </p>
      ) : (
        <>
          <ul className="mt-5 space-y-1">
            {rows.map((member) => (
              <li key={member.key}>
                <MemberRow member={member}>
                <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                <span className="min-w-0 flex-1 basis-40 truncate text-sm font-semibold text-slate-800">
                  {member.name}
                </span>
                <div className="flex min-w-0 flex-[2] basis-48 items-center gap-3">
                  <div
                    className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"
                    role="img"
                    aria-label={`${member.name}: ${member.complete} finalised, ${member.review} in review, ${member.draft} draft`}
                  >
                    {SEGMENTS.map(({ key, label, meta }) =>
                      member[key] > 0 ? (
                        <span
                          key={key}
                          title={`${member[key]} ${label.toLowerCase()}`}
                          style={{
                            width: `${(member[key] / busiest) * 100}%`,
                            backgroundColor: meta.colour,
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-extrabold tabular-nums text-slate-900">
                    {member.total}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {SEGMENTS.map(({ key, label, meta }) => (
                    <span
                      key={key}
                      className={cn(
                        "rounded-lg border px-2 py-0.5 text-xs font-bold tabular-nums",
                        meta.badge,
                        member[key] === 0 && "opacity-45",
                      )}
                      title={label}
                    >
                      {member[key]}
                      <span className="sr-only"> {label}</span>
                    </span>
                  ))}
                </div>
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className={cn("shrink-0 text-slate-300", !member.memberId && "invisible")}
                />
                </MemberRow>
              </li>
            ))}
          </ul>

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 px-2 text-sm font-bold text-primary hover:underline"
            >
              Show {hidden} more {hidden === 1 ? "member" : "members"}
            </button>
          )}

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {SEGMENTS.map(({ key, label, meta }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: meta.colour }}
                />
                {label} · <span className="font-bold tabular-nums text-slate-700">{team[key]}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * The row itself: a link to the member's page where there is one to link to. The
 * "Former members" row has no membership behind it, so it stays inert rather than
 * leading somewhere that would 404.
 */
function MemberRow({ member, children }: { member: MemberWorkload; children: ReactNode }) {
  const className =
    "flex flex-wrap items-center gap-3 rounded-xl px-2 py-2 transition-colors sm:flex-nowrap";
  if (!member.memberId) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link
      href={`/settings/members/${member.memberId}`}
      className={cn(className, "hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none")}
      aria-label={`${member.name}: ${member.total} cases`}
    >
      {children}
    </Link>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-supplied storage URL, no loader config
    return <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500"
    >
      {initials}
    </span>
  );
}
