import type { Database } from "@/types/supabase";
import type { Case } from "@/types/dashboard";
import { buildSurveyData } from "./buildSurveyData";
import { mapSurveyToCase } from "./mapper";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

/**
 * The one way to turn a case into the row `classifyLahr` should see.
 *
 * A persisted `surveys` row is NOT that row. User overrides live in `raw_ai_data.userOverrides`
 * and are applied on top of the wizard data by `buildSurveyData`, so classifying the raw DB row
 * skips them and yields a stale band. Every UI surface already rebuilt the row by hand before
 * classifying; the cost-estimation API route did not, so a generated plan could be built against
 * a different band than the one rendered beside it.
 *
 * Both entry points below funnel into the same `buildSurveyData` call. Nothing outside
 * `lib/surveys/` and the survey write path (`app/api/surveys/save`, `lib/surveys/actions.ts`)
 * should call `buildSurveyData` directly — a test in `__tests__/resolveSurveyRow.test.ts`
 * enforces that.
 *
 * @param overrides Defaults to the overrides persisted on the case. Pass explicitly only to
 *   classify against unsaved edits (ReportView's live-vs-assessed staleness comparison).
 */
export function resolveSurveyRow(
  caseData: Case,
  overrides?: Record<string, unknown>,
): Partial<SurveyRow> {
  return buildSurveyData(
    caseData.mlData?.wizardData || {},
    overrides ?? caseData.mlData?.userOverrides ?? {},
    caseData.mlData?.rawAhr || {},
    caseData,
    "",
  ) as Partial<SurveyRow>;
}

/** Server-side entry point: a raw `surveys` row → the canonical row to classify. */
export function resolveSurveyRowFromDb(survey: SurveyRow): Partial<SurveyRow> {
  return resolveSurveyRow(mapSurveyToCase(survey));
}
