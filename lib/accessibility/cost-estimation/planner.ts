import type { Database } from "@/types/supabase";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import type { LahrBandId } from "@/lib/accessibility/lahr/types";
import type { Difficulty, RemediationInstance } from "./types";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

const DIFFICULTY_RANK: Record<Difficulty, number> = { minor: 1, moderate: 2, major: 3 };

export function applyPatchesToSurvey(
  survey: Partial<SurveyRow>,
  adaptations: RemediationInstance[],
): Partial<SurveyRow> {
  const patched: Record<string, unknown> = { ...survey };
  for (const a of adaptations) {
    for (const [k, v] of Object.entries(a.fieldPatches ?? {})) {
      patched[k] = v;
    }
  }
  return patched as Partial<SurveyRow>;
}

export function projectBandAfter(
  survey: Partial<SurveyRow>,
  adaptations: RemediationInstance[],
): LahrBandId {
  return classifyLahr(applyPatchesToSurvey(survey, adaptations)).band;
}

export function aggregateDifficulty(items: { difficulty: Difficulty }[]): Difficulty {
  let max = 0;
  for (const it of items) max = Math.max(max, DIFFICULTY_RANK[it.difficulty]);
  return (Object.keys(DIFFICULTY_RANK) as Difficulty[]).find(
    (d) => DIFFICULTY_RANK[d] === max,
  ) ?? "minor";
}
