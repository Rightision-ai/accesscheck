import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

export type JobStatus = {
  status: "pending" | "ready" | "failed";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  step?: string;
  model?: string;
};

/**
 * Background-job bookkeeping lives on `surveys.cost_estimation_status`.
 *
 * The column keeps its old name deliberately: `touch_surveys_updated_at()` hardcodes it in a
 * `to_jsonb(NEW) - '…'` expression so that writing job status does NOT bump `updated_at`.
 * Renaming the column without rewriting that trigger would make every completed job mark its
 * own survey stale and raise the "Re-assess" banner.
 */
export async function writeJobStatus(
  supabase: SupabaseClient<Database>,
  surveyId: number,
  job: JobStatus | null,
): Promise<void> {
  await supabase
    .from("surveys")
    .update({ cost_estimation_status: job as unknown as Json })
    .eq("id", surveyId);
}

export async function readJobStatus(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<JobStatus | null> {
  const { data } = await supabase
    .from("surveys")
    .select("cost_estimation_status")
    .eq("id", surveyId)
    .maybeSingle();

  return (data?.cost_estimation_status as JobStatus | null) ?? null;
}
