import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import {
  aggregateDifficulty,
  projectBandAfter,
} from "@/lib/accessibility/cost-estimation/planner";
import {
  clearCostEstimation,
  loadCostEstimation,
  persistCostEstimation,
} from "@/lib/accessibility/cost-estimation/repository";
import {
  buildCostEstimationPrompt,
  collectTriggeredRules,
} from "@/lib/gemini/prompts/costEstimationPrompt";
import {
  DFG_BUDGET_TIERS,
  DFG_MAX_BUDGET,
  type CostEstimation,
  type Difficulty,
  type DfgBudgetGbp,
  type RemediationInstance,
  type TierPlan,
} from "@/lib/accessibility/cost-estimation/types";
import { rankOf, type LahrBandId } from "@/lib/accessibility/lahr/types";
import type { Database } from "@/types/supabase";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// 2.5 Flash returns in 5-10s vs ~30s for Pro on this prompt — critical for fitting under
// Vercel's serverless timeout. Quality is similar for structured planning / JSON output.
// Override via GEMINI_COST_MODEL env var if you want to test Pro again.
const GEMINI_MODEL = process.env.GEMINI_COST_MODEL || "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_PHOTO_INPUTS = 3;
const DIFFICULTIES: Difficulty[] = ["minor", "moderate", "major"];

// Vercel ceiling. On Hobby this clamps to 60; Pro Fluid Compute honours up to 300. The Gemini
// 2.5 Pro call alone runs ~30s, plus 5–10s of image fetches from Supabase.
export const maxDuration = 300;

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiAdaptation = {
  label?: string;
  addresses_rules?: number[];
  cost_gbp?: number;
  duration_days?: number;
  difficulty?: Difficulty;
  trades?: string[];
  preconditions?: string;
  narrative?: string;
  visual_evidence_confidence?: number;
  field_patches?: Record<string, unknown>;
};

type GeminiTier = {
  budget_gbp?: number;
  total_cost_gbp?: number;
  total_duration_days?: number;
  overall_difficulty?: Difficulty;
  potential_band_estimate?: LahrBandId;
  adaptations?: GeminiAdaptation[];
  dropped_candidates?: { label?: string; reason?: string }[];
};

type GeminiPayload = {
  current_band?: LahrBandId;
  overall_narrative?: string;
  tiers?: GeminiTier[];
  reaches_band_a_at_30k?: boolean;
  rationale_if_not_band_a?: string;
  confidence?: number;
};

type JobStatus = {
  status: "pending" | "ready" | "failed";
  startedAt: string;
  finishedAt?: string;
  error?: string;
  step?: string;
  model?: string;
};

/**
 * POST kicks off cost-estimation work and returns 202 immediately. The Gemini call + persistence
 * runs in the background via Next 16's `after()`, which on Vercel Pro Fluid keeps the function
 * alive after the HTTP response. This sidesteps the 60s gateway timeout that was producing 504s.
 *
 * The client polls GET /api/gemini/cost-estimation?surveyId=N for the result.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const surveyId = typeof body?.surveyId === "number" ? body.surveyId : Number(body?.surveyId);
  if (!surveyId || !Number.isFinite(surveyId)) {
    return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: survey, error: surveyErr } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .single();
  if (surveyErr || !survey) {
    return NextResponse.json(
      { error: "Survey not found", details: surveyErr?.message ?? null },
      { status: 404 },
    );
  }

  const evaluation = classifyLahr(survey);
  if (evaluation.band === "A") {
    await clearCostEstimation(supabase, surveyId);
    await writeJobStatus(supabase, surveyId, null);
    return NextResponse.json({ applicable: false, currentBand: "A" });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Cost estimation requires GEMINI_API_KEY to be configured." },
      { status: 503 },
    );
  }

  // Mark as pending synchronously so the next poll knows work is in flight.
  const startedAt = new Date().toISOString();
  await writeJobStatus(supabase, surveyId, {
    status: "pending",
    startedAt,
    model: GEMINI_MODEL,
  });

  // Background work — runs after the response is sent.
  after(async () => {
    const t0 = Date.now();
    const log = (step: string, extra?: Record<string, unknown>) => {
      console.log(`[cost-estimation:bg] ${step}`, { tMs: Date.now() - t0, surveyId, ...extra });
    };
    let step = "load_evidence";
    try {
      const { data: evidences, error: evidErr } = await supabase
        .from("survey_evidences")
        .select("id, file_url, mime_type, section")
        .eq("survey_id", surveyId);
      if (evidErr) console.warn("[cost-estimation:bg] evidence load warning:", evidErr.message);
      const evidenceList = (evidences ?? []).slice(0, MAX_PHOTO_INPUTS);
      const imageParts = await Promise.all(
        evidenceList.map((e) => toInlinePart(e.file_url, e.mime_type)),
      );
      const validImageParts = imageParts.filter((p): p is Exclude<typeof p, null> => p !== null);
      log(step, { evidenceCount: evidenceList.length, validImages: validImageParts.length });

      step = "call_gemini";
      const gemini = await callGemini({
        currentBand: evaluation.band,
        triggeredRules: collectTriggeredRules(evaluation),
        imageParts: validImageParts,
      });
      log(step, {
        tierCount: gemini.tiers?.length ?? 0,
        adaptationsTotal:
          gemini.tiers?.reduce((s, t) => s + (t.adaptations?.length ?? 0), 0) ?? 0,
      });

      step = "build_tiers";
      const tiers: TierPlan[] = DFG_BUDGET_TIERS.map((b) => {
        const geminiTier = gemini.tiers?.find((t) => Number(t?.budget_gbp) === b);
        return buildTier({ budget: b, geminiTier, survey });
      });
      log(step, {
        tiers: tiers.map((t) => ({
          budget: t.budgetGbp,
          adaptations: t.adaptations.length,
          cost: t.totalCostGbp,
          band: t.potentialBand,
        })),
      });

      const at30k = tiers.find((t) => t.budgetGbp === DFG_MAX_BUDGET);
      const reachesBandAAt30k = at30k?.potentialBand === "A";
      const estimation: CostEstimation = {
        currentBand: evaluation.band,
        tiers,
        reachesBandAAt30k,
        rationaleIfNotBandA: reachesBandAAt30k
          ? undefined
          : gemini.rationale_if_not_band_a ??
            `Within £${DFG_MAX_BUDGET.toLocaleString()} this property reaches band ${
              tiers[tiers.length - 1].potentialBand
            }. Reaching band A would require further work beyond what visible evidence supports.`,
        overallNarrative:
          gemini.overall_narrative ??
          `Current Accessible Housing Rules band is ${evaluation.band}. The plan above bundles bespoke adaptations to lift the property toward a higher band within each DFG tier.`,
        confidence: clamp01(gemini.confidence ?? (validImageParts.length > 0 ? 0.65 : 0.45)),
        generatedAt: new Date().toISOString(),
        geminiModel: GEMINI_MODEL,
        budgetCapGbp: DFG_MAX_BUDGET,
      };

      step = "persist_estimation";
      await persistCostEstimation(supabase, surveyId, estimation);
      log(step);

      await writeJobStatus(supabase, surveyId, {
        status: "ready",
        startedAt,
        finishedAt: new Date().toISOString(),
        model: GEMINI_MODEL,
      });
    } catch (err) {
      const e = err as Error;
      console.error(`[cost-estimation:bg] failed at step="${step}":`, {
        message: e?.message,
        stack: e?.stack,
        surveyId,
      });
      await writeJobStatus(supabase, surveyId, {
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: (e?.message ?? String(err)).slice(0, 500),
        step,
        model: GEMINI_MODEL,
      });
    }
  });

  return NextResponse.json({ status: "pending", surveyId, startedAt }, { status: 202 });
}

/**
 * GET returns the current job status and the loaded estimation if ready. The client polls this
 * after kicking off a POST.
 */
export async function GET(req: NextRequest) {
  const surveyId = Number(req.nextUrl.searchParams.get("surveyId"));
  if (!surveyId || !Number.isFinite(surveyId)) {
    return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
  }
  const supabase = await createClient();
  const job = await readJobStatus(supabase, surveyId);
  const estimation = await loadCostEstimation(supabase, surveyId);

  if (estimation && (!job || job.status === "ready")) {
    return NextResponse.json({ status: "ready", estimation, job });
  }
  if (job?.status === "failed") {
    return NextResponse.json({ status: "failed", error: job.error, step: job.step, job });
  }
  if (job?.status === "pending") {
    return NextResponse.json({ status: "pending", job });
  }
  return NextResponse.json({ status: "missing" });
}

async function writeJobStatus(
  supabase: SupabaseClient<Database>,
  surveyId: number,
  job: JobStatus | null,
): Promise<void> {
  // Read current raw_ai_data, merge the marker in, write back. JSONB-safe and migration-free.
  const { data, error } = await supabase
    .from("surveys")
    .select("raw_ai_data")
    .eq("id", surveyId)
    .single();
  if (error || !data) return;
  const raw = (data.raw_ai_data ?? {}) as Record<string, unknown>;
  if (job === null) {
    delete raw.cost_estimation_status;
  } else {
    raw.cost_estimation_status = job;
  }
  await supabase
    .from("surveys")
    .update({ raw_ai_data: raw as Database["public"]["Tables"]["surveys"]["Update"]["raw_ai_data"] })
    .eq("id", surveyId);
}

async function readJobStatus(
  supabase: SupabaseClient<Database>,
  surveyId: number,
): Promise<JobStatus | null> {
  const { data } = await supabase
    .from("surveys")
    .select("raw_ai_data")
    .eq("id", surveyId)
    .single();
  const raw = (data?.raw_ai_data ?? {}) as Record<string, unknown>;
  const job = raw.cost_estimation_status as JobStatus | undefined;
  return job ?? null;
}

function buildTier(args: {
  budget: DfgBudgetGbp;
  geminiTier: GeminiTier | undefined;
  survey: Partial<SurveyRow>;
}): TierPlan {
  const { budget, geminiTier, survey } = args;
  const fallback = (potentialBand: LahrBandId): TierPlan => ({
    budgetGbp: budget,
    totalCostGbp: 0,
    totalDurationDays: 0,
    overallDifficulty: "minor",
    potentialBand,
    adaptations: [],
    droppedCandidates: [],
  });

  const currentBand = classifyLahr(survey).band;
  if (!geminiTier?.adaptations?.length) {
    console.warn(`[cost-estimation] buildTier(${budget}): no geminiTier match — using fallback`, {
      hadGeminiTier: !!geminiTier,
      adaptationCount: geminiTier?.adaptations?.length ?? 0,
    });
    return fallback(currentBand);
  }

  const adaptations: RemediationInstance[] = [];
  let runningCost = 0;
  let droppedForBudget = 0;
  let droppedForLabel = 0;
  for (const a of geminiTier.adaptations) {
    if (!a.label) { droppedForLabel++; continue; }
    const cost = sanitiseCost(a.cost_gbp);
    if (runningCost + cost > budget) { droppedForBudget++; continue; } // Enforce the tier cap regardless of model arithmetic.
    runningCost += cost;

    adaptations.push({
      label: String(a.label).slice(0, 200),
      addressesRules: Array.isArray(a.addresses_rules)
        ? a.addresses_rules.filter((n) => Number.isFinite(n)).map((n) => Math.trunc(n))
        : [],
      costGbp: cost,
      durationDays: sanitiseDuration(a.duration_days),
      difficulty: DIFFICULTIES.includes(a.difficulty as Difficulty)
        ? (a.difficulty as Difficulty)
        : "minor",
      trades: Array.isArray(a.trades)
        ? a.trades.filter((t): t is string => typeof t === "string").slice(0, 8)
        : [],
      narrative: typeof a.narrative === "string" ? a.narrative.slice(0, 600) : undefined,
      preconditions: typeof a.preconditions === "string" ? a.preconditions.slice(0, 400) : undefined,
      visualEvidenceConfidence:
        typeof a.visual_evidence_confidence === "number"
          ? clamp01(a.visual_evidence_confidence)
          : undefined,
      fieldPatches: a.field_patches && typeof a.field_patches === "object" ? a.field_patches : {},
    });
  }

  const projectedBand = projectBandAfter(survey, adaptations);

  console.log(`[cost-estimation] buildTier(${budget}):`, {
    proposed: geminiTier.adaptations.length,
    accepted: adaptations.length,
    droppedForLabel,
    droppedForBudget,
    runningCost,
    currentBand,
    projectedBand,
  });

  // If the projected band somehow regressed below the current band, treat as a no-op tier.
  if (rankOf(projectedBand) > rankOf(currentBand)) {
    console.warn(`[cost-estimation] buildTier(${budget}): projected band regressed — using fallback`, {
      currentBand,
      projectedBand,
    });
    return fallback(currentBand);
  }

  const dropped = Array.isArray(geminiTier.dropped_candidates)
    ? geminiTier.dropped_candidates
        .filter((d): d is { label: string; reason?: string } => typeof d?.label === "string")
        .map((d) => ({
          label: d.label.slice(0, 200),
          reason: typeof d.reason === "string" ? d.reason.slice(0, 400) : "Dropped by estimator.",
        }))
    : [];

  return {
    budgetGbp: budget,
    totalCostGbp: runningCost,
    totalDurationDays: adaptations.reduce((s, a) => s + a.durationDays, 0),
    overallDifficulty: aggregateDifficulty(adaptations),
    potentialBand: projectedBand,
    adaptations,
    droppedCandidates: dropped,
  };
}

function sanitiseCost(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.round(n));
}

function sanitiseDuration(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.max(1, Math.round(n));
}

function clamp01(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(1, n));
}

async function toInlinePart(
  url: string | null | undefined,
  mime: string | null | undefined,
): Promise<{ inline_data: { mime_type: string; data: string } } | null> {
  if (!url || !mime?.startsWith("image/")) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 4 * 1024 * 1024) return null;
    return { inline_data: { mime_type: mime, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

async function callGemini(args: {
  currentBand: LahrBandId;
  triggeredRules: ReturnType<typeof collectTriggeredRules>;
  imageParts: { inline_data: { mime_type: string; data: string } }[];
}): Promise<GeminiPayload> {
  const prompt = buildCostEstimationPrompt({
    currentBand: args.currentBand,
    triggeredRules: args.triggeredRules,
    budgets: DFG_BUDGET_TIERS,
  });

  const parts: GeminiPart[] = [{ text: prompt }, ...args.imageParts];

  const res = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        // Three tiers of bespoke prose hit ~12K tokens. 16K leaves headroom without inflating
        // generation time on Vercel.
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errorText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Gemini returned no JSON object${finishReason ? ` (finishReason=${finishReason})` : ""}`,
    );
  }
  const raw = jsonMatch[0];
  try {
    return JSON.parse(raw) as GeminiPayload;
  } catch (parseErr) {
    const repaired = repairJson(raw);
    try {
      return JSON.parse(repaired) as GeminiPayload;
    } catch {
      const reason = (parseErr as Error).message;
      throw new Error(
        `Gemini returned malformed JSON (${reason})${finishReason ? `; finishReason=${finishReason}` : ""}; length=${raw.length}`,
      );
    }
  }
}

/**
 * Best-effort repair for the JSON malformations Gemini produces despite responseMimeType:
 * trailing commas, unterminated strings at truncation points, and missing closing brackets when
 * the response was cut off. Not a general-purpose JSON repairer — scoped to what we observe.
 */
function repairJson(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastSafeIndex = -1; // last index after a complete key:value or element

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") {
      stack.push(c);
    } else if (c === "}" || c === "]") {
      stack.pop();
      lastSafeIndex = i;
    } else if (c === "," && stack.length > 0) {
      lastSafeIndex = i - 1;
    }
  }

  // If we ended inside a string, truncate back to the last safe element/comma boundary so we
  // discard the partial token entirely instead of trying to close it.
  if (inString && lastSafeIndex >= 0) {
    s = s.slice(0, lastSafeIndex + 1);
    // Recompute bracket stack against the truncated source.
    stack.length = 0;
    inString = false;
    escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === "{" || c === "[") stack.push(c);
      else if (c === "}" || c === "]") stack.pop();
    }
  }

  // Drop trailing commas before close brackets, then close any still-open containers.
  s = s.replace(/,(\s*[}\]])/g, "$1");
  while (stack.length) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }
  return s;
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429) {
        const wait = Math.pow(2, i) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const wait = Math.pow(2, i) * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini fetch failed");
}
