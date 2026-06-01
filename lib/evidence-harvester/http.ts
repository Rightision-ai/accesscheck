/**
 * Shared HTTP helper for Evidence Harvester external API calls.
 *
 * Extracted from the pattern in app/api/gemini/cost-estimation/route.ts: retry transient failures
 * (network errors and 429/5xx) with exponential backoff + jitter. External integrations
 * (Postcodes.io, EPC, Land Registry, Street View) all funnel through this so per-row enrichment
 * fails gracefully rather than aborting the whole harvest job.
 */

export type FetchRetryOptions = {
  retries?: number;
  /** Base backoff in ms; doubled each attempt. */
  baseDelayMs?: number;
  /** Per-attempt timeout in ms. */
  timeoutMs?: number;
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchRetryOptions = {},
): Promise<Response> {
  const { retries = 3, baseDelayMs = 500, timeoutMs = 15000 } = options;
  let lastErr: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries - 1) {
        await sleep(backoff(baseDelayMs, attempt));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries - 1) {
        await sleep(backoff(baseDelayMs, attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`fetch failed: ${url}`);
}

/** GET JSON with retry; returns null on non-2xx (caller decides how to treat a miss). */
export async function getJson<T>(
  url: string,
  init: RequestInit = {},
  options?: FetchRetryOptions,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetchWithRetry(url, { ...init, method: init.method ?? 'GET' }, options);
  if (!res.ok) return { ok: false, status: res.status, data: null };
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: true, status: res.status, data };
}

function backoff(base: number, attempt: number): number {
  return Math.pow(2, attempt) * base + Math.random() * 250;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
