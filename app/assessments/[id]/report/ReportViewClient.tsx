'use client';

import React from 'react';
import ReportView from '@/app/components/report/ReportView';
import { useRouter } from 'next/navigation';
import { saveAssessmentWithStatus } from '@/lib/surveys/assessmentStatus';
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

  // Finalising (review → complete) is the one status change this screen makes.
  const handleUpdateCase = async (updatedCase: Case) => {
    try {
        const result = await saveAssessmentWithStatus(updatedCase, caseData.status);
        if (result.error) {
            toast.error(`Failed to save: ${result.error}`);
            return;
        }
        if (result.statusError) {
            toast.error(result.statusError);
            return;
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
