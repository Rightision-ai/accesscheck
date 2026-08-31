import { fetchWithRetry } from "@/lib/evidence-harvester/http";
import { engineUrl, type ThinkingLevel } from "./models";
import { repairJson } from "./json";

export type InlineImagePart = {
  inline_data: { mime_type: string; data: string };
};

export type EnginePart = { text: string } | InlineImagePart;

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Strip the upstream vendor and model out of text that can reach a user.
 *
 * Failures from this call are stored on `surveys.cost_estimation_status.error` and rendered
 * verbatim in the plan's error banner, so an upstream message like
 * `models/gemini-3.7-flash is not found` would put the model name on screen. The engine is the
 * product's own as far as anyone outside the team is concerned.
 */
export function redactVendor(text: string): string {
  return text
    .replace(/\bmodels\/[\w.-]+/gi, "the engine model")
    .replace(/\bgemini[\w.-]*/gi, "the engine model")
    .replace(/\bgenerativelanguage\.googleapis\.com\b/gi, "the engine endpoint")
    .replace(/\bgoogle\.ai\.generativelanguage\.[\w.]+/gi, "the engine API")
    .replace(/\bgoogle(?:apis)?\b/gi, "the engine");
}

/** Fetch an image and inline it as base64, or return null if it is unusable. */
export async function toInlinePart(
  url: string | null | undefined,
  mime: string | null | undefined,
): Promise<InlineImagePart | null> {
  if (!url || !mime?.startsWith("image/")) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_INLINE_IMAGE_BYTES) return null;
    return { inline_data: { mime_type: mime, data: buffer.toString("base64") } };
  } catch {
    return null;
  }
}

/**
 * One JSON call to Gemini.
 *
 * Notes on the generation config, both of which matter on Gemini 3:
 * - No `temperature`. Google's guidance is to leave it at the default 1.0; lowering it can
 *   cause looping or degraded reasoning. Every call site here previously pinned 0.2.
 * - Thinking depth goes in `generationConfig.thinkingConfig.thinkingLevel`. It is NOT a
 *   top-level `generationConfig` field — putting it there returns
 *   `400 Unknown name "thinking_level" at 'generation_config'`. The flat form is the
 *   Interactions API's shape, which `generateContent` does not share.
 *
 * `finishReason` is always surfaced on failure — a `MAX_TOKENS` truncation is the difference
 * between "the model had nothing to say" and "we cut it off", and the caller must be able to
 * fail the job loudly rather than persist an empty result.
 */
export async function callEngineJson<T>(args: {
  apiKey: string;
  model: string;
  parts: EnginePart[];
  maxOutputTokens: number;
  thinkingLevel: ThinkingLevel;
  responseSchema?: Record<string, unknown>;
}): Promise<{ payload: T; finishReason?: string }> {
  const response = await fetchWithRetry(
    `${engineUrl(args.model)}?key=${args.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: args.parts }],
        generationConfig: {
          maxOutputTokens: args.maxOutputTokens,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: args.thinkingLevel },
          ...(args.responseSchema ? { responseSchema: args.responseSchema } : {}),
        },
      }),
    },
    // fetchWithRetry defaults to a 15s per-attempt timeout, tuned for the small Postcodes.io
    // and EPC lookups it was written for. A generation call runs 10-30s, so the default would
    // abort every one of them mid-flight and then retry into the same wall.
    { timeoutMs: 120_000, retries: 3 },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Engine ${response.status}: ${redactVendor(errorText).slice(0, 300)}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(
      `Engine returned no JSON object${finishReason ? ` (finishReason=${finishReason})` : ""}`,
    );
  }

  try {
    return { payload: JSON.parse(match[0]) as T, finishReason };
  } catch (parseError) {
    try {
      return { payload: JSON.parse(repairJson(match[0])) as T, finishReason };
    } catch {
      throw new Error(
        `Engine returned malformed JSON (${(parseError as Error).message})` +
          `${finishReason ? `; finishReason=${finishReason}` : ""}; length=${match[0].length}`,
      );
    }
  }
}
