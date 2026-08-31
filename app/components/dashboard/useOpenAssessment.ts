"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeAssessmentStatus } from "@/lib/assessments/status";
import type { Case } from "@/types/dashboard";

/**
 * The one place that decides what opening an assessment means: a draft an author can edit
 * resumes in the wizard, anything else goes to its case detail page. Shared by the
 * dashboard's recent cases and the assessments list so a click behaves the same in both.
 */
export function useOpenAssessment(canAuthor: boolean) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<Partial<Case> | null>(null);

  const openAssessment = useCallback(
    (assessment: Case) => {
      if (canAuthor && normalizeAssessmentStatus(assessment.status) === "draft") {
        setWizardInitialData({
          id: assessment.id,
          ...(assessment.mlData?.wizardData || {}),
          // `evidence` is a fallback only — the wizard prefers wizardData.categoryPhotos
          // and reconciles the two on open, so `photos` must not be overridden here.
          evidence: assessment.evidence,
        });
        setWizardOpen(true);
        return;
      }
      router.push(`/cases/${assessment.id}`);
    },
    [canAuthor, router],
  );

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardInitialData(null);
  }, []);

  const startNewAssessment = useCallback(() => {
    setWizardInitialData(null);
    setWizardOpen(true);
  }, []);

  return {
    wizardOpen,
    wizardInitialData,
    openAssessment,
    closeWizard,
    startNewAssessment,
    setWizardOpen,
  };
}
