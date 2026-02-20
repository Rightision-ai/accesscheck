'use client';

import React from 'react';
import ReportView from '@/app/components/report/ReportView';
import { useRouter } from 'next/navigation';
import { saveSurvey } from '@/lib/surveys/actions';
import { Case } from '@/types/dashboard';
import { toast } from 'sonner';

export default function ReportViewClient({ caseData }: { caseData: Case }) {
  const router = useRouter();

  const handleUpdateCase = async (updatedCase: Case) => {
    try {
        const result = await saveSurvey(updatedCase);
        if (result.error) {
            toast.error(`Failed to save: ${result.error}`);
        } else {
            toast.success('Report updated successfully');
            router.refresh();
        }
    } catch (error) {
        console.error(error);
        toast.error('An unexpected error occurred');
    }
  };

  return (
    <ReportView
      caseData={caseData}
      onBack={() => router.push('/')}
      onUpdateCase={handleUpdateCase}
    />
  );
}
