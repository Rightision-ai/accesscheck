"use client";

import React, { useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import AssessmentWizard from "@/app/components/wizard/AssessmentWizard";
import CaseCard from "@/app/components/dashboard/CaseCard";
import { useOpenAssessment } from "@/app/components/dashboard/useOpenAssessment";
import AssessmentStatusBadge from "@/app/components/common/AssessmentStatusBadge";
import Pager from "@/app/components/common/Pager";
import { submitAssessmentForReview } from "@/lib/surveys/assessmentStatus";
import { cn } from "@/lib/utils/cn";
import type { Case } from "@/types/dashboard";

type ViewMode = "grid" | "list";

const VIEW_STORAGE_KEY = "accesscheck.assessments.view";
const VIEW_CHANGE_EVENT = "accesscheck:assessments-view";

/**
 * The remembered grid/list choice, read straight from localStorage rather than mirrored
 * into state — that keeps the server render ("grid") and the hydrated client render
 * consistent without a setState-in-effect round trip.
 */
function subscribeToView(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VIEW_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VIEW_CHANGE_EVENT, onChange);
  };
}

/** Keeps the toggle working for the session when localStorage is unavailable. */
const viewFallback = { mode: "grid" as ViewMode };

function readView(): ViewMode {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    // Private windows and blocked site data — remember it in memory instead.
    return viewFallback.mode;
  }
}

function readServerView(): ViewMode {
  return "grid";
}

function writeView(mode: ViewMode) {
  viewFallback.mode = mode;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // Not being able to remember the choice shouldn't stop us switching it.
  }
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

type Props = {
  cases: Case[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  canAuthor: boolean;
};

export default function AssessmentsClient({
  cases,
  total,
  page,
  pages,
  pageSize,
  canAuthor,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = useSyncExternalStore(subscribeToView, readView, readServerView);
  const { wizardOpen, wizardInitialData, openAssessment, closeWizard } =
    useOpenAssessment(canAuthor);

  const goToPage = (target: number) => {
    if (target < 1 || target > pages || target === page) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(target));
    router.push(`/assessments?${next}`);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <span className="text-sm text-slate-500">
            {total} assessment{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-1 rounded-lg bg-slate-50 p-1">
            {(
              [
                { mode: "grid" as const, Icon: LayoutGrid, label: "Card view" },
                { mode: "list" as const, Icon: List, label: "Table view" },
              ]
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={viewMode === mode}
                onClick={() => writeView(mode)}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-md border-none p-2",
                  viewMode === mode
                    ? "bg-white text-primary shadow-sm"
                    : "bg-transparent text-slate-400",
                )}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="p-14 text-center">
            <h2 className="font-bold text-slate-900">No assessments found</h2>
            <p className="mt-1 text-sm text-slate-500">
              Change the filters or create a new assessment.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid items-stretch gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {cases.map((assessment) => (
              <CaseCard
                key={assessment.id}
                caseData={assessment}
                onClick={() => openAssessment(assessment)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Inspector</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Band</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((assessment) => {
                  const row = (assessment.mlData?.surveyRow ?? {}) as Record<string, unknown>;
                  const updatedAt = row.updated_at ? String(row.updated_at) : "";
                  return (
                    <tr
                      key={assessment.id}
                      onClick={() => openAssessment(assessment)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900 line-clamp-2">
                          {assessment.address}
                        </p>
                        <p className="text-xs text-slate-500">
                          {assessment.postcode || "No postcode"} · #{assessment.id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {assessment.applicantName || "Not recorded"}
                      </td>
                      <td className="px-5 py-4">
                        <AssessmentStatusBadge status={assessment.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {String(row.overall_grade || "—")}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {updatedAt ? new Date(updatedAt).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {/* The whole row is clickable; this stays as the keyboard-reachable
                            affordance, so it must not fire the row handler twice. */}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAssessment(assessment);
                          }}
                          className="font-bold text-primary"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 px-5 py-4">
          <Pager
            current={page}
            pageCount={pages}
            total={total}
            pageSize={pageSize}
            onChange={goToPage}
          />
        </div>
      </div>

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
          if (result.statusError) toast.error(result.statusError);
          closeWizard();
          router.push(`/cases/${String(result.id ?? newCase.id)}`);
          router.refresh();
        }}
        onSaveDraft={() => {
          closeWizard();
          router.refresh();
        }}
      />
    </>
  );
}
