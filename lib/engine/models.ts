/**
 * The single place every Gemini model id is chosen.
 *
 * Six call sites used to hardcode their own model and build their own endpoint URL, so a model
 * bump meant editing six files and missing one. Each entry keeps an env override so a single
 * variable rolls one route back without a deploy.
 *
 * `gemini-3.7-flash` (stable, 13 August 2026) is Google's current workhorse — it supersedes
 * both `gemini-2.5-flash` and the `gemini-2.5-pro` the extraction routes were pinned to, takes
 * image inputs, and supports structured output via `responseSchema`.
 *
 * Not covered here: `lib/engine/accessibilityTaggerService.ts`, which calls a Vertex AI *tuned*
 * model. Re-pointing that one means retraining.
 */
export const ENGINE_MODELS = {
  /** Adaptation-plan candidate pool. Structured JSON + property photos. */
  adaptationPool: process.env.ENGINE_COST_MODEL || "gemini-3.7-flash",
  /** Report field extraction. */
  reportFill: process.env.ENGINE_REPORT_MODEL || "gemini-3.7-flash",
  /** Evidence photo analysis. */
  analyze: process.env.ENGINE_ANALYZE_MODEL || "gemini-3.7-flash",
  /** Floor-plan image extraction. */
  floorImages: process.env.ENGINE_FLOOR_IMAGES_MODEL || "gemini-3.7-flash",
  /** Floor-plan measurement extraction. */
  floorPlan: process.env.ENGINE_FLOORPLAN_MODEL || "gemini-3.7-flash",
  /** Exterior street-view vision (evidence harvester). */
  exteriorVision: process.env.ENGINE_VISION_MODEL || "gemini-3.7-flash",
} as const;

export function engineUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

/**
 * How the engine is named to users — in the UI, the report PDF and every export.
 *
 * The underlying model id is still persisted on `adaptation_plans.engine_model` and written to
 * the job status, because attribution matters when a plan is questioned months later. It is
 * operational data, never product copy: no surface renders it.
 * `lib/engine/__tests__/branding.test.ts` enforces that.
 */
export const ENGINE_DISPLAY_NAME = "Rightision AI Engine";

/**
 * How hard the model should think before answering, replacing the legacy `thinking_budget`.
 *
 * It is nested — `generationConfig.thinkingConfig.thinkingLevel` — NOT a flat field on
 * `generationConfig`. The flat `generation_config.thinking_level` form in Google's Gemini 3
 * guide belongs to the Interactions API; `generateContent` rejects it with
 * `400 Unknown name "thinking_level" at 'generation_config'`.
 *
 * Always build it with `thinkingConfig()` below rather than writing the object inline.
 */
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

/** The only correct way to express a thinking level to `generateContent`. */
export function thinkingConfig(level: ThinkingLevel) {
  return { thinkingConfig: { thinkingLevel: level } } as const;
}

/**
 * Base generation config for a JSON-returning call.
 *
 * Note there is no `temperature`. Google's Gemini 3 guidance is to leave it at the default of
 * 1.0 and warns that lowering it "may lead to unexpected behavior, such as looping or degraded
 * performance". Every one of these call sites previously pinned `temperature: 0.2`, which was
 * right for 2.5 and is a hazard on 3.x.
 */
export function jsonGenerationConfig(options: {
  maxOutputTokens: number;
  thinkingLevel: ThinkingLevel;
  responseSchema?: Record<string, unknown>;
}) {
  return {
    maxOutputTokens: options.maxOutputTokens,
    responseMimeType: "application/json",
    ...thinkingConfig(options.thinkingLevel),
    ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
  };
}
