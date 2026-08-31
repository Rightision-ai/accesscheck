/**
 * One-off backfill for the Phase 1 adaptation-plan refactor.
 *
 * `20260901120100_replace_cost_estimation_plans.sql` discards every stored plan, so without
 * this every open case would show "not generated yet" and the UI's auto-generate effect would
 * fire a burst of concurrent engine calls the first time anyone opened them. This walks the
 * estate deliberately instead: one survey at a time, with a pause between, so cost and rate
 * limits stay predictable.
 *
 * Usage (from the repo root, with .env.local populated):
 *
 *   npx tsx scripts/backfill-adaptation-plans.ts --dry-run
 *   npx tsx scripts/backfill-adaptation-plans.ts --limit 5
 *   npx tsx scripts/backfill-adaptation-plans.ts
 *
 * Flags:
 *   --dry-run        list what would be regenerated, call nothing
 *   --limit N        stop after N surveys (default: no limit)
 *   --delay-ms N     pause between surveys (default 4000)
 *   --org UUID       restrict to one organisation
 *
 * Run it against a small --limit first and check the output before the full pass.
 */
import { createClient } from "@supabase/supabase-js";
import { classifyLahr } from "../lib/accessibility/lahr/classifier";
import { resolveSurveyRowFromDb } from "../lib/surveys/resolveSurveyRow";
import { loadRateCardForOrganisation } from "../lib/rate-cards/repository";
import { buildAdaptationPlanSet } from "../lib/adaptation-plans/buildPlan";
import { parseCandidatePool } from "../lib/adaptation-plans/candidatePool";
import { triggeredRuleNumbers } from "../lib/adaptation-plans/planner";
import { persistAdaptationPlanSet } from "../lib/adaptation-plans/repository";
import { DFG_BUDGET_TIERS } from "../lib/adaptation-plans/types";
import { callEngineJson, toInlinePart, type EnginePart } from "../lib/engine/engineClient";
import { ENGINE_MODELS } from "../lib/engine/models";
import {
  ADAPTATION_POOL_RESPONSE_SCHEMA,
  buildAdaptationPoolPrompt,
  collectTriggeredRules,
} from "../lib/engine/prompts/adaptationPoolPrompt";

type Args = {
  dryRun: boolean;
  limit: number | null;
  delayMs: number;
  organisationId: string | null;
};

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limit = value("--limit");
  const delay = value("--delay-ms");
  return {
    dryRun: argv.includes("--dry-run"),
    limit: limit ? Number(limit) : null,
    delayMs: delay ? Number(delay) : 4000,
    organisationId: value("--org") ?? null,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const engineKey = process.env.ENGINE_API_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  if (!engineKey && !args.dryRun) {
    throw new Error("ENGINE_API_KEY is required (or pass --dry-run).");
  }

  // Service role bypasses RLS, so organisation_id must be set explicitly on every write.
  const supabase = createClient(url, serviceKey);

  let query = supabase
    .from("surveys")
    .select("*")
    .not("organisation_id", "is", null)
    .order("id", { ascending: true });
  if (args.organisationId) query = query.eq("organisation_id", args.organisationId);

  const { data: surveys, error } = await query;
  if (error) throw new Error(`Failed to list surveys: ${error.message}`);

  console.log(`Found ${surveys?.length ?? 0} survey(s) with an organisation.`);

  const rateCards = new Map<string, Awaited<ReturnType<typeof loadRateCardForOrganisation>>>();
  let generated = 0;
  let skippedBandA = 0;
  let failed = 0;

  for (const survey of surveys ?? []) {
    if (args.limit !== null && generated >= args.limit) {
      console.log(`Reached --limit ${args.limit}; stopping.`);
      break;
    }

    const surveyId = survey.id as number;
    const organisationId = survey.organisation_id as string;

    const surveyRow = resolveSurveyRowFromDb(survey as never);
    const evaluation = classifyLahr(surveyRow);
    if (evaluation.band === "A") {
      skippedBandA++;
      continue;
    }

    if (args.dryRun) {
      console.log(`[dry-run] survey ${surveyId} — band ${evaluation.band} — would regenerate`);
      generated++;
      continue;
    }

    try {
      if (!rateCards.has(organisationId)) {
        rateCards.set(
          organisationId,
          await loadRateCardForOrganisation(supabase as never, organisationId),
        );
      }
      const rateCard = rateCards.get(organisationId)!;

      const { data: evidences } = await supabase
        .from("survey_evidences")
        .select("file_url, mime_type")
        .eq("survey_id", surveyId);
      const imageParts = (
        await Promise.all(
          (evidences ?? [])
            .slice(0, 3)
            .map((evidence) =>
              toInlinePart(
                evidence.file_url as string | null,
                evidence.mime_type as string | null,
              ),
            ),
        )
      ).filter((part): part is NonNullable<typeof part> => part !== null);

      const parts: EnginePart[] = [
        {
          text: buildAdaptationPoolPrompt({
            currentBand: evaluation.band,
            triggeredRules: collectTriggeredRules(evaluation),
            workItems: rateCard.items,
          }),
        },
        ...imageParts,
      ];

      const { payload, finishReason } = await callEngineJson<unknown>({
        apiKey: engineKey!,
        model: ENGINE_MODELS.adaptationPool,
        parts,
        maxOutputTokens: 16384,
        thinkingLevel: "medium",
        responseSchema: ADAPTATION_POOL_RESPONSE_SCHEMA as unknown as Record<string, unknown>,
      });

      const parsed = parseCandidatePool({
        raw: payload,
        rateCard,
        triggeredRules: triggeredRuleNumbers(surveyRow),
      });
      if (parsed.pool.length === 0) {
        throw new Error(
          `no priceable adaptation${finishReason ? ` (finishReason=${finishReason})` : ""}`,
        );
      }

      const planSet = buildAdaptationPlanSet({
        survey: surveyRow,
        currentBand: evaluation.band,
        pool: parsed.pool,
        budgets: DFG_BUDGET_TIERS,
        rateCard,
        engineModel: ENGINE_MODELS.adaptationPool,
        additionalWorks: parsed.additionalWorks,
        poolDropped: parsed.dropped,
        overallNarrative: parsed.overallNarrative,
        rationaleIfNotBandA: parsed.rationaleIfNotBandA,
      });

      await persistAdaptationPlanSet(supabase as never, surveyId, organisationId, planSet);

      const summary = planSet.tiers
        .map((tier) => `£${tier.budgetGbp / 1000}k→${tier.potentialBand}`)
        .join(" ");
      console.log(`survey ${surveyId} — ${evaluation.band} — ${summary}`);
      generated++;
    } catch (cause) {
      failed++;
      console.error(`survey ${surveyId} FAILED: ${(cause as Error).message}`);
    }

    await sleep(args.delayMs);
  }

  console.log(
    `\nDone. generated=${generated} skippedBandA=${skippedBandA} failed=${failed}` +
      (args.dryRun ? " (dry run — nothing was written)" : ""),
  );
}

main().catch((cause) => {
  console.error(cause);
  process.exit(1);
});
