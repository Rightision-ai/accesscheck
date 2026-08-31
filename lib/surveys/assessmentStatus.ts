import { saveSurveyClient } from "./client";
import type { AssessmentStatus } from "@/types/accesscheck";
import type { Case } from "@/types/dashboard";

export type AssessmentSaveResult = {
  /** The persisted survey id — present whenever the save itself succeeded. */
  id?: string;
  /** Set when the row saved but its status could not be changed. */
  statusError?: string;
  /** Set when the save itself failed; nothing was persisted. */
  error?: string;
};

/** Asks the status route to move one assessment, returning its error message if it refuses. */
async function requestStatus(
  id: string,
  status: AssessmentStatus,
  reason?: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(`/api/assessments/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return body?.error || "Unable to update the assessment status.";
    return undefined;
  } catch {
    return "Could not reach the server to update the assessment status.";
  }
}

/**
 * Persists an assessment and, if its status changed, asks the status route to move it.
 *
 * Two steps, in this order and no other: `/api/surveys/save` writes the survey columns and
 * evidence rows and then refreshes `assessment_completion_percent`, which the status route
 * reads to enforce the 100%-complete gate. Submitting first would always be judged against
 * stale completion data. That route also ignores `status` on an update — transitions are
 * validated and audited in one place only.
 *
 * A failed status change is not a failed save: the content is stored either way, so callers
 * should surface `statusError` and carry on rather than trapping the user.
 */
export async function saveAssessmentWithStatus(
  caseData: Case,
  previousStatus: AssessmentStatus,
  reason?: string,
): Promise<AssessmentSaveResult> {
  const saved = await saveSurveyClient(caseData);
  if (saved.error) return { error: saved.error };

  const id = String(saved.id ?? caseData.id);
  if (caseData.status === previousStatus) return { id };
  return { id, statusError: await requestStatus(id, caseData.status, reason) };
}

/** Saves a finished wizard run and submits it for review. */
export async function submitAssessmentForReview(
  caseData: Case,
): Promise<AssessmentSaveResult> {
  const saved = await saveSurveyClient(caseData);
  if (saved.error) return { error: saved.error };

  const id = String(saved.id ?? caseData.id);
  return { id, statusError: await requestStatus(id, "review") };
}
