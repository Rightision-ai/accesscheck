'use client';

import React from 'react';
import ValidationInterface from '@/app/components/validation/ValidationInterface';
import { useRouter } from 'next/navigation';
import { saveSurveyClient } from '@/lib/surveys/client';
import { Case } from '@/types/dashboard';
import { toast } from 'sonner';

export default function ValidationInterfaceClient({ caseData, user }: { caseData: Case; user: { name: string; role: string } | null }) {
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
            toast.error(body.error || "Unable to update assessment status");
            return;
          }
        }
        toast.success('Case updated successfully');
        router.refresh();
    } catch (error) {
        console.error(error);
        toast.error('An unexpected error occurred');
    }
  };

  const handleDelete = async () => {
      // Implement delete logic if needed
      toast.error("Delete not implemented yet");
  };

  return (
    <ValidationInterface
      caseData={caseData}
      onBack={() => router.push('/dashboard')}
      onUpdateCase={handleUpdateCase}
      onOpenReport={() => router.push(`/assessments/${caseData.id}/report`)}
      onDelete={handleDelete}
      user={user}
    />
  );
}
