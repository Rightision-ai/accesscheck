/**
 * One-off backfill that replaces the retired A+/A-/B+/B-/C grades in `surveys.overall_grade`
 * with the Accessible Housing Rules band (A-G).
 *
 * The column has stored the LAHR band since `buildSurveyData` started writing it, but rows
 * assessed before that still carry the old scorer's grade. Everything that reads the column
 * rather than classifying live — the dashboard band donut, the CSV export, `/api/reports` —
 * therefore shows a scale the product no longer has, and buckets those rows as "Not yet
 * banded". This recomputes the band the same way a save would: `resolveSurveyRowFromDb` +
 * `classifyLahr`, no engine calls, so it is cheap and deterministic.
 *
 * Usage (from the repo root, with .env.local populated):
 *
 *   npx tsx --env-file=.env.local scripts/backfill-lahr-bands.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-lahr-bands.ts
 *
 * Flags:
 *   --dry-run    list what would change, write nothing
 *   --all        also rewrite rows that already hold a valid band (default: legacy/missing only)
 *   --org UUID   restrict to one organisation
 *
 * Run --dry-run first and check the output before the real pass.
 */
import { createClient } from "@supabase/supabase-js";
import { classifyLahr } from "../lib/accessibility/lahr/classifier";
import { LAHR_BAND_BY_ID, lahrBandToScore } from "../lib/accessibility/lahr/types";
import { resolveSurveyRowFromDb } from "../lib/surveys/resolveSurveyRow";

type Args = {
  dryRun: boolean;
  all: boolean;
  organisationId: string | null;
};

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    dryRun: argv.includes("--dry-run"),
    all: argv.includes("--all"),
    organisationId: value("--org") ?? null,
  };
}

function isCurrentBand(grade: unknown): boolean {
  return String(grade ?? "").trim().toUpperCase() in LAHR_BAND_BY_ID;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  // Service role bypasses RLS; every write below is keyed by survey id, so nothing crosses
  // an organisation boundary.
  const supabase = createClient(url, serviceKey);

  let query = supabase.from("surveys").select("*").order("id", { ascending: true });
  if (args.organisationId) query = query.eq("organisation_id", args.organisationId);

  const { data: surveys, error } = await query;
  if (error) throw new Error(`Failed to list surveys: ${error.message}`);
  console.log(`Found ${surveys?.length ?? 0} survey(s).`);

  let updated = 0;
  let alreadyBanded = 0;
  let unchanged = 0;
  let failed = 0;

  for (const survey of surveys ?? []) {
    const surveyId = survey.id as number;
    const current = survey.overall_grade as string | null;

    if (!args.all && isCurrentBand(current)) {
      alreadyBanded++;
      continue;
    }

    try {
      const band = classifyLahr(resolveSurveyRowFromDb(survey as never)).band;
      if (current === band) {
        unchanged++;
        continue;
      }

      if (args.dryRun) {
        console.log(`[dry-run] survey ${surveyId} — ${current ?? "none"} → ${band}`);
        updated++;
        continue;
      }

      const { error: writeError } = await supabase
        .from("surveys")
        // compliance_score is derived from the band on the write path, so it would otherwise
        // stay pinned to the old scorer's percentage.
        .update({ overall_grade: band, compliance_score: lahrBandToScore(band) })
        .eq("id", surveyId);
      if (writeError) throw new Error(writeError.message);

      console.log(`survey ${surveyId} — ${current ?? "none"} → ${band}`);
      updated++;
    } catch (cause) {
      failed++;
      console.error(`survey ${surveyId} FAILED: ${(cause as Error).message}`);
    }
  }

  console.log(
    `\nDone. updated=${updated} alreadyBanded=${alreadyBanded} unchanged=${unchanged} failed=${failed}` +
      (args.dryRun ? " (dry run — nothing was written)" : ""),
  );
}

main().catch((cause) => {
  console.error(cause);
  process.exit(1);
});
