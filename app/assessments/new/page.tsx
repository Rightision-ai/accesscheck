"use client";

import React from "react";
import AssessmentWizard from "@/app/components/wizard/AssessmentWizard";
import { useRouter } from "next/navigation";
import { submitAssessmentForReview } from "@/lib/surveys/assessmentStatus";
import { toast } from "sonner";
import type { Case } from "@/types/dashboard";

export default function NewAssessmentPage() {
  const router = useRouter();

  // Finishing the wizard submits for review; the wizard has already saved and generated
  // the report by this point.
  const handleComplete = async (newCase: Case) => {
    try {
      const result = await submitAssessmentForReview(newCase);
      if (result.error) {
        toast.error(`Failed to save: ${result.error}`);
        return;
      }
      if (result.statusError) {
        // The work is stored as a draft — say what happened rather than losing the run.
        toast.error(result.statusError);
      } else {
        toast.success("Assessment submitted for review");
      }

      if (result.id) {
        router.push(`/assessments/${result.id}/report`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    }
  };

  // "Save Progress" keeps the case a draft — the wizard has already persisted it, so there
  // is nothing to do here but get out of the way.
  const handleSaveDraft = () => {
    router.push("/assessments");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AssessmentWizard
        isOpen={true}
        onClose={() => router.push("/assessments")}
        onComplete={handleComplete}
        initialData={null}
        onSaveDraft={handleSaveDraft}
      />
    </div>
  );
}
