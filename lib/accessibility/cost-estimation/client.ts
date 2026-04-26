import type { CostEstimation } from "./types";

type StatusResponse =
  | { status: "ready"; estimation: CostEstimation }
  | { status: "pending" }
  | { status: "failed"; error?: string; step?: string }
  | { status: "missing" };

/**
 * Poll /api/gemini/cost-estimation?surveyId=N until the background job finishes. The POST
 * returns 202 immediately and the actual Gemini work runs server-side via Next 16's `after()`.
 * Polls every 3 seconds for up to 2 minutes.
 */
export async function pollCostEstimation(
  surveyId: number,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<CostEstimation> {
  const intervalMs = opts.intervalMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(
      `/api/gemini/cost-estimation?surveyId=${encodeURIComponent(String(surveyId))}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      throw new Error(`Status check failed (HTTP ${res.status})`);
    }
    const payload = (await res.json()) as StatusResponse;
    if (payload.status === "ready") return payload.estimation;
    if (payload.status === "failed") {
      throw new Error(payload.error || "Cost estimation failed in background.");
    }
    // pending / missing → keep polling
  }
  throw new Error("Cost estimation timed out — please retry.");
}
