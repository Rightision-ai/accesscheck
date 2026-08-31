import type { AdaptationPlanSet } from "./types";

type StatusResponse =
  | { status: "ready"; plan: AdaptationPlanSet }
  | { status: "pending" }
  | { status: "failed"; error?: string; step?: string }
  | { status: "missing" };

/**
 * Poll /api/engine/cost-estimation?surveyId=N until the background job finishes.
 *
 * The POST returns 202 immediately and the engine call runs server-side via Next 16's
 * `after()`. The route's `maxDuration` is 300s, so the poll deadline sits just under it: the
 * old 120s ceiling meant a slow job showed "timed out — please retry" in the UI while still
 * succeeding on the server, and the retry then started a second engine call.
 */
export async function pollAdaptationPlan(
  surveyId: number,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<AdaptationPlanSet> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 280_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const response = await fetch(
      `/api/engine/cost-estimation?surveyId=${encodeURIComponent(String(surveyId))}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`Status check failed (HTTP ${response.status})`);
    }
    const payload = (await response.json()) as StatusResponse;
    if (payload.status === "ready") return payload.plan;
    if (payload.status === "failed") {
      throw new Error(payload.error || "Adaptation plan generation failed in background.");
    }
    // pending / missing → keep polling
  }
  throw new Error("Adaptation plan timed out — please retry.");
}
