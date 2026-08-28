"use client";

import React from "react";
import AssessmentWizard from "@/app/components/wizard/AssessmentWizard";
import { useRouter } from "next/navigation";
import { saveSurveyClient } from "@/lib/surveys/client";
import { toast } from "sonner";
import type { Case } from "@/types/dashboard";

export default function NewAssessmentPage() {
  const router = useRouter();

  const handleComplete = async (newCase: Case) => {
    try {
      const result = await saveSurveyClient(newCase);
      if (result.error) {
        toast.error(`Failed to save: ${result.error}`);
        return;
      }
      toast.success("Assessment saved successfully");

      // If we have a new ID from the server, redirect to the report page
      if (result.id) {
        router.push(`/assessments/${result.id}/report`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AssessmentWizard
        isOpen={true}
        onClose={() => router.push("/")}
        onComplete={handleComplete}
        initialData={null}
        onSaveDraft={handleComplete}
      />
    </div>
  );
}
