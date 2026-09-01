"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import AssessmentWizard from "@/app/components/wizard/AssessmentWizard";
import CaseCard from "@/app/components/dashboard/CaseCard";
import BandDonutChart from "@/app/components/dashboard/BandDonutChart";
import WeeklyTrendChart from "@/app/components/dashboard/WeeklyTrendChart";
import TeamWorkloadCard from "@/app/components/dashboard/TeamWorkloadCard";
import { useOpenAssessment } from "@/app/components/dashboard/useOpenAssessment";
import type { BandSlice, MemberWorkload } from "@/lib/assessments/analytics";
import { submitAssessmentForReview } from "@/lib/surveys/assessmentStatus";
import type { AssessmentStatus } from "@/types/accesscheck";
import type { Case } from "@/types/dashboard";

type Summary = {
  open: number;
  draft: number;
  review: number;
  complete: number;
  completedInPeriod: number;
  medianCompletionDays: number | null;
  readiness: { ready: number; partial: number; incomplete: number };
};

type Props = {
  initialCases: Case[];
  summary: Summary;
  weeklyTrend: Array<{ week: string; started: number; completed: number }>;
  bandDistribution: BandSlice[];
  canAuthor: boolean;
  /** Per-member figures, supplied only for admins; null for everyone else. */
  teamWorkload: MemberWorkload[] | null;
};

export default function DashboardClient({
  initialCases,
  summary,
  weeklyTrend,
  bandDistribution,
  canAuthor,
  teamWorkload,
}: Props) {
  const router = useRouter();
  const {
    wizardOpen,
    wizardInitialData,
    openAssessment,
    closeWizard,
    startNewAssessment,
  } = useOpenAssessment(canAuthor);
  const [cases, setCases] = useState(initialCases);
  const summaryCards = [
    {
      label: "Open assessments",
      value: summary.open,
      icon: ClipboardCheck,
      card: "border-primary-dark bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_8px_24px_rgba(15,183,91,0.2)]",
      labelClass: "text-white/80",
      iconClass: "bg-white/15 text-white",
    },
    {
      label: "Draft queue",
      value: summary.draft,
      icon: FileText,
      card: "border-slate-300 bg-slate-100 text-slate-800",
      labelClass: "text-slate-500",
      iconClass: "bg-white text-slate-500",
    },
    {
      label: "Awaiting review",
      value: summary.review,
      icon: Clock3,
      card: "border-amber-200 bg-amber-50 text-amber-900",
      labelClass: "text-amber-700",
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      label: "Completed · 30 days",
      value: summary.completedInPeriod,
      icon: FileCheck2,
      card: "border-emerald-200 bg-emerald-50 text-emerald-900",
      labelClass: "text-emerald-700",
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    /*|{ label: "Median completion", value: summary.medianCompletionDays == null ? "—" : `${Math.round(summary.medianCompletionDays)}d`, icon: Timer, card: "border-violet-200 bg-violet-50 text-violet-900", labelClass: "text-violet-700", iconClass: "bg-violet-100 text-violet-700" },
     */
  ];

  const recentCases = cases.slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Assessment overview
            </h1>
            <p className="mt-1 text-[15px] font-medium text-slate-500">
              Council-wide assessment activity, accessibility bands and recent
              work.
            </p>
          </div>
          {canAuthor && (
            <button
              onClick={startNewAssessment}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(15,183,91,0.25)] transition hover:bg-primary-dark"
            >
              <Plus size={18} /> New assessment
            </button>
          )}
        </div>

        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 "
          aria-label="Assessment summary"
        >
          {summaryCards.map(
            ({ label, value, icon: Icon, card, labelClass, iconClass }) => (
              <div key={label} className={`rounded-2xl border p-5 ${card}`}>
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
                >
                  <Icon size={20} />
                </div>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${labelClass}`}
                >
                  {label}
                </p>
                <p className="mt-1 text-3xl font-extrabold leading-none">
                  {value}
                </p>
              </div>
            ),
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <WeeklyTrendChart weeks={weeklyTrend} />
          </section>
          <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Accessibility bands</h2>
            <p className="mb-6 text-sm text-slate-500">
              Share of assessed stock by Accessible Housing Rules band
            </p>
            <BandDonutChart slices={bandDistribution} />
          </section>
        </div>

        {recentCases.length > 0 && (
          <section className="mt-6" aria-label="Recent cases">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-950">Recent cases</h2>
                <p className="text-sm text-slate-500">
                  The properties your team last worked on
                </p>
              </div>
              <Link
                href="/assessments"
                className="text-sm font-bold text-primary"
              >
                All assessments
              </Link>
            </div>
            <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {recentCases.map((assessment) => (
                <CaseCard
                  key={assessment.id}
                  caseData={assessment}
                  onClick={(id) => {
                    const target = cases.find((item) => item.id === id);
                    if (target) openAssessment(target);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {teamWorkload && <TeamWorkloadCard workload={teamWorkload} />}

        <AssessmentWizard
          isOpen={wizardOpen}
          initialData={wizardInitialData}
          onClose={closeWizard}
          onComplete={async (newCase) => {
            const result = await submitAssessmentForReview(newCase);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            const realId = String(result.id ?? newCase.id);
            // A failed submit still leaves the work saved as a draft — say so and carry on
            // rather than trapping the user in the wizard.
            const status: AssessmentStatus = result.statusError
              ? "draft"
              : "review";
            if (result.statusError) toast.error(result.statusError);
            setCases((current) =>
              [
                { ...newCase, id: realId, status },
                ...current.filter((item) => item.id !== realId),
              ].slice(0, 8),
            );
            closeWizard();
            router.push(`/cases/${realId}`);
            router.refresh();
          }}
          onSaveDraft={(draft) => {
            setCases((current) =>
              [draft, ...current.filter((item) => item.id !== draft.id)].slice(
                0,
                8,
              ),
            );
            closeWizard();
          }}
        />
      </div>
    </div>
  );
}
