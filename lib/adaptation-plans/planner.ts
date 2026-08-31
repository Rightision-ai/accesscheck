import type { Database } from "@/types/supabase";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type { Difficulty } from "./types";
import { isPatchableColumn } from "./patchWhitelist";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

/** Anything carrying patches — a candidate, a plan line, or a bare recipe. */
type Patchable = { fieldPatches: Record<string, unknown> };

const DIFFICULTY_RANK: Record<Difficulty, number> = { minor: 1, moderate: 2, major: 3 };
const DIFFICULTY_BY_RANK: Difficulty[] = ["minor", "minor", "moderate", "major"];

/**
 * `g_rules` is informational — the classifier never lets it cap the band, so spending money to
 * resolve one buys nothing.
 */
const INFORMATIONAL_SECTION = "g_rules";

/**
 * Apply a bundle's patches to a copy of the survey row.
 *
 * Unknown columns are dropped. `lib/rate-cards/repository.ts` already filters when a card row
 * becomes a domain object, but two sources never pass through it: plan lines rehydrated from
 * `adaptation_plan_lines` when an existing plan is loaded, and `RULE_RECIPES`. Since this is the
 * function that actually builds the row `classifyLahr` sees, filtering here is what makes
 * "only whitelisted columns can affect a band" true for every path rather than most of them.
 */
export function applyPatchesToSurvey(
  survey: Partial<SurveyRow>,
  items: Patchable[],
): Partial<SurveyRow> {
  const patched: Record<string, unknown> = { ...survey };
  for (const item of items) {
    for (const [column, value] of Object.entries(item.fieldPatches ?? {})) {
      if (isPatchableColumn(column)) patched[column] = value;
    }
  }
  return patched as Partial<SurveyRow>;
}

export function projectBandAfter(
  survey: Partial<SurveyRow>,
  items: Patchable[],
): LahrBandId {
  return classifyLahr(applyPatchesToSurvey(survey, items)).band;
}

export function aggregateDifficulty(items: { difficulty: Difficulty }[]): Difficulty {
  const rank = items.reduce((max, item) => Math.max(max, DIFFICULTY_RANK[item.difficulty]), 0);
  return DIFFICULTY_BY_RANK[rank];
}

/** Rule numbers currently capping the band, excluding the informational section. */
export function triggeredRuleNumbers(survey: Partial<SurveyRow>): Set<number> {
  const triggered = new Set<number>();
  for (const criterion of classifyLahr(survey).criteria) {
    if (criterion.sectionId === INFORMATIONAL_SECTION) continue;
    for (const rule of criterion.triggeredRules) triggered.add(rule.n);
  }
  return triggered;
}

export function difficultyRank(difficulty: Difficulty): number {
  return DIFFICULTY_RANK[difficulty];
}
