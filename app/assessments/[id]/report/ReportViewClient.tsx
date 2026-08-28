'use client';

import React from 'react';
import ReportView from '@/app/components/report/ReportView';
import { useRouter } from 'next/navigation';
import { saveSurveyClient } from '@/lib/surveys/client';
import { Case } from '@/types/dashboard';
import { toast } from 'sonner';
import type { CostEstimation } from '@/lib/accessibility/cost-estimation/types';

export default function ReportViewClient({
  caseData,
  costEstimation,
}: {
  caseData: Case;
  costEstimation?: CostEstimation | null;
}) {
  const router = useRouter();

  const handleUpdateCase = async (updatedCase: Case) => {
    try {
        const statusChanged = updatedCase.status !== caseData.status;
        const result = await saveSurveyClient(
          statusChanged ? { ...updatedCase, status: caseData.status } : updatedCase,
        );
        if (result.error) {
            toast.error(`Failed to save: ${result.error}`);
            return;
        }
        if (statusChanged) {
          const response = await fetch(`/api/assessments/${caseData.id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: updatedCase.status }),
          });
          const body = await response.json();
          if (!response.ok) {
            toast.error(body.error || "Only a Reviewer can complete this assessment");
            return;
          }
        }
        toast.success('Report updated successfully');
        router.refresh();
    } catch (error) {
        console.error(error);
        toast.error('An unexpected error occurred');
    }
  };

  return (
    <ReportView
      caseData={caseData}
      costEstimation={costEstimation}
      onBack={() => router.push('/dashboard')}
      onUpdateCase={handleUpdateCase}
    />
  );
}
