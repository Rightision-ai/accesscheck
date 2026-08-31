import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { resolveSurveyRowFromDb } from "@/lib/surveys/resolveSurveyRow";
import { isAssessmentLocked } from "@/lib/assessments/status";
import { ENGINE_MODELS } from "@/lib/engine/models";
import { callEngineJson, toInlinePart, type EnginePart } from "@/lib/engine/engineClient";
import {
  ADAPTATION_POOL_RESPONSE_SCHEMA,
  buildAdaptationPoolPrompt,
  collectTriggeredRules,
} from "@/lib/engine/prompts/adaptationPoolPrompt";
import { loadRateCardForOrganisation } from "@/lib/rate-cards/repository";
import { buildAdaptationPlanSet } from "@/lib/adaptation-plans/buildPlan";
import { parseCandidatePool } from "@/lib/adaptation-plans/candidatePool";
import { triggeredRuleNumbers } from "@/lib/adaptation-plans/planner";
import {
  clearAdaptationPlanSet,
  loadAdaptationPlanSet,
  persistAdaptationPlanSet,
} from "@/lib/adaptation-plans/repository";
import { readJobStatus, writeJobStatus } from "@/lib/adaptation-plans/jobStatus";
import { DFG_BUDGET_TIERS } from "@/lib/adaptation-plans/types";

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const ENGINE_MODEL = ENGINE_MODELS.adaptationPool;
const MAX_PHOTO_INPUTS = 3;
/** One flat pool is far smaller than three tiers of verbatim-duplicated prose. */
const MAX_OUTPUT_TOKENS = 16384;

// Vercel ceiling. On Hobby this clamps to 60; Pro Fluid Compute honours up to 300. The engine
// call runs ~10-30s, plus 5-10s of image fetches from Supabase.
export const maxDuration = 300;

/**
 * POST kicks off plan generation and returns 202 immediately. The engine call and persistence
 * run in the background via Next 16's `after()`, which on Vercel Pro Fluid keeps the function
 * alive after the HTTP response — sidestepping the 60s gateway timeout that produced 504s.
 *
 * The client polls GET /api/engine/cost-estimation?surveyId=N for the result.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const surveyId =
    typeof body?.surveyId === "number" ? body.surveyId : Number(body?.surveyId);
  if (!surveyId || !Number.isFinite(surveyId)) {
    return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
  }

  const context = await requireApiContext("author");
  if (isApiError(context)) return context;

  const supabase = await createClient();

  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select("*")
    .eq("id", surveyId)
    .eq("organisation_id", context.organisationId)
    .single();
  if (surveyError || !survey) {
    return NextResponse.json(
      { error: "Survey not found", details: surveyError?.message ?? null },
      { status: 404 },
    );
  }

  // A finalised plan must not silently re-price. Until now `complete` was purely a UI
  // convention — no route, RLS policy or trigger refused a write because a survey was finished —
  // so disabling the button was not a control. This is the single choke point: both plan
  // components' buttons and both auto-generate effects come through here.
  if (
    isAssessmentLocked({
      status: survey.status,
      isLocked: (survey.raw_ai_data as { isLocked?: boolean } | null)?.isLocked,
    })
  ) {
    return NextResponse.json(
      {
        error:
          "This assessment is finalised. Reopen it to a draft before regenerating the adaptation plan.",
      },
      { status: 409 },
    );
  }

  // Classify the resolved row, not the raw DB row. User overrides live in
  // raw_ai_data.userOverrides and every UI surface applies them before classifying; the raw row
  // leaves most rules unevaluable, which used to send sparse surveys down the band-A
  // short-circuit and produce no plan at all for a property the UI was showing as band D.
  const surveyRow = resolveSurveyRowFromDb(survey);
  const evaluation = classifyLahr(surveyRow);

  if (evaluation.band === "A") {
    await clearAdaptationPlanSet(supabase, surveyId);
    await writeJobStatus(supabase, surveyId, null);
    return NextResponse.json({ applicable: false, currentBand: "A" });
  }

  if (!ENGINE_API_KEY) {
    return NextResponse.json(
      { error: "Adaptation planning requires ENGINE_API_KEY to be configured." },
      { status: 503 },
    );
  }

  const startedAt = new Date().toISOString();
  await writeJobStatus(supabase, surveyId, {
    status: "pending",
    startedAt,
    model: ENGINE_MODEL,
  });

  after(async () => {
    const startedMs = Date.now();
    const log = (step: string, extra?: Record<string, unknown>) => {
      console.log(`[adaptation-plan:bg] ${step}`, {
        tMs: Date.now() - startedMs,
        surveyId,
        ...extra,
      });
    };
    let step = "load_rate_card";
    try {
      const rateCard = await loadRateCardForOrganisation(supabase, context.organisationId);
      log(step, { rateCard: rateCard.code, items: rateCard.items.length });

      step = "load_evidence";
      const { data: evidences, error: evidenceError } = await supabase
        .from("survey_evidences")
        .select("id, file_url, mime_type, section")
        .eq("survey_id", surveyId);
      if (evidenceError) {
        console.warn("[adaptation-plan:bg] evidence load warning:", evidenceError.message);
      }
      const imageParts = (
        await Promise.all(
          (evidences ?? [])
            .slice(0, MAX_PHOTO_INPUTS)
            .map((evidence) => toInlinePart(evidence.file_url, evidence.mime_type)),
        )
      ).filter((part): part is NonNullable<typeof part> => part !== null);
      log(step, { images: imageParts.length });

      step = "call_engine";
      const prompt = buildAdaptationPoolPrompt({
        currentBand: evaluation.band,
        triggeredRules: collectTriggeredRules(evaluation),
        workItems: rateCard.items,
      });
      const parts: EnginePart[] = [{ text: prompt }, ...imageParts];
      const { payload, finishReason } = await callEngineJson<unknown>({
        apiKey: ENGINE_API_KEY,
        model: ENGINE_MODEL,
        parts,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingLevel: "high",
        responseSchema: ADAPTATION_POOL_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      });
      log(step, { finishReason });

      step = "build_pool";
      const parsed = parseCandidatePool({
        raw: payload,
        rateCard,
        triggeredRules: triggeredRuleNumbers(surveyRow),
      });
      log(step, {
        pool: parsed.pool.length,
        additionalWorks: parsed.additionalWorks.length,
        dropped: parsed.dropped.length,
      });

      // An empty pool means the call produced nothing usable — a truncation, a refusal, or a
      // payload we could not price. Fail the job loudly rather than persisting three empty
      // tiers that render as a finished plan claiming no adaptation is possible.
      if (parsed.pool.length === 0) {
        throw new Error(
          "Engine returned no priceable adaptation" +
            (finishReason ? ` (finishReason=${finishReason})` : "") +
            (parsed.additionalWorks.length > 0
              ? `; ${parsed.additionalWorks.length} unpriced work item(s) proposed`
              : ""),
        );
      }

      step = "select_tiers";
      const planSet = buildAdaptationPlanSet({
        survey: surveyRow,
        currentBand: evaluation.band,
        pool: parsed.pool,
        budgets: DFG_BUDGET_TIERS,
        rateCard,
        engineModel: ENGINE_MODEL,
        additionalWorks: parsed.additionalWorks,
        poolDropped: parsed.dropped,
        overallNarrative: parsed.overallNarrative,
        rationaleIfNotBandA: parsed.rationaleIfNotBandA,
      });
      log(step, {
        tiers: planSet.tiers.map((tier) => ({
          budget: tier.budgetGbp,
          lines: tier.lines.length,
          cost: tier.totalCost.expectedGbp,
          band: tier.potentialBand,
        })),
      });

      step = "persist_plan";
      await persistAdaptationPlanSet(supabase, surveyId, context.organisationId, planSet);
      log(step);

      await writeJobStatus(supabase, surveyId, {
        status: "ready",
        startedAt,
        finishedAt: new Date().toISOString(),
        model: ENGINE_MODEL,
      });
    } catch (error) {
      const failure = error as Error;
      console.error(`[adaptation-plan:bg] failed at step="${step}":`, {
        message: failure?.message,
        stack: failure?.stack,
        surveyId,
      });
      await writeJobStatus(supabase, surveyId, {
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: (failure?.message ?? String(error)).slice(0, 500),
        step,
        model: ENGINE_MODEL,
      });
    }
  });

  return NextResponse.json({ status: "pending", surveyId, startedAt }, { status: 202 });
}

/** GET returns the current job status, and the stored plan when it is ready. */
export async function GET(req: NextRequest) {
  const surveyId = Number(req.nextUrl.searchParams.get("surveyId"));
  if (!surveyId || !Number.isFinite(surveyId)) {
    return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
  }

  const context = await requireApiContext();
  if (isApiError(context)) return context;

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("surveys")
    .select("id")
    .eq("id", surveyId)
    .eq("organisation_id", context.organisationId)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const job = await readJobStatus(supabase, surveyId);
  const plan = await loadAdaptationPlanSet(supabase, surveyId);

  if (plan && (!job || job.status === "ready")) {
    return NextResponse.json({ status: "ready", plan, job });
  }
  if (job?.status === "failed") {
    return NextResponse.json({ status: "failed", error: job.error, step: job.step, job });
  }
  if (job?.status === "pending") {
    return NextResponse.json({ status: "pending", job });
  }
  return NextResponse.json({ status: "missing" });
}
