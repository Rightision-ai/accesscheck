import type { Database } from "@/types/supabase";
import businessRulesData from "./tables/business-rules.json";
import { buildRuleEnv, withSectionLength } from "./env";
import { evaluateCondition, type RuleEnv } from "./evaluator";
import {
  type CriterionResult,
  type LahrBandId,
  type LahrEvaluation,
  lowerOf,
  higherOf,
  rankOf,
} from "./types";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

type Rule = {
  n: number;
  cap_band: LahrBandId;
  description: string;
  condition: string;
};

type Section = {
  id: string;
  label: string;
  applies_when?: string;
  rules: Rule[];
};

const SECTIONS = (businessRulesData.sections as Section[]).map((s) => ({
  ...s,
  rules: s.rules as Rule[],
}));

const MAIN_ACCESS_SECTIONS = new Set(["main_access", "communal_ramp_gradient", "property_ramp_gradient"]);
const SECOND_EXIT_SECTIONS = new Set(["second_exit"]);
const G_SECTION_ID = "g_rules";

const LENGTH_VAR_BY_SECTION: Record<string, string | undefined> = {
  communal_ramp_gradient: "CommunalRampLength",
  property_ramp_gradient: "PropertyRampLength",
  second_exit: "SecondExitRampLength",
};

function evaluateSection(section: Section, env: RuleEnv): CriterionResult {
  let sectionEnv = env;
  const lengthVar = LENGTH_VAR_BY_SECTION[section.id];
  if (lengthVar) {
    const lengthVal = env[lengthVar];
    sectionEnv = withSectionLength(env, typeof lengthVal === "number" ? lengthVal : undefined);
  }

  const triggered: CriterionResult["triggeredRules"] = [];
  let cappedBand: LahrBandId | null = null;

  for (const rule of section.rules) {
    let hit = false;
    try {
      hit = evaluateCondition(rule.condition, sectionEnv);
    } catch (err) {
      console.warn(`[lahr] Rule ${rule.n} failed to evaluate: ${(err as Error).message}`);
      continue;
    }
    if (!hit) continue;
    triggered.push({
      n: rule.n,
      capBand: rule.cap_band,
      description: rule.description,
      condition: rule.condition,
    });
    if (cappedBand === null || rankOf(rule.cap_band) > rankOf(cappedBand)) {
      cappedBand = rule.cap_band;
    }
  }

  const status: CriterionResult["status"] =
    triggered.length === 0
      ? "pass"
      : cappedBand === "G"
        ? "unknown"
        : cappedBand === "F"
          ? "fail"
          : "partial";

  const rationale =
    triggered.length === 0
      ? `No LAHR rules triggered for section "${section.label}".`
      : triggered
          .map((t) => `Rule ${t.n} (cap ${t.capBand}): ${t.description}`)
          .join("; ");

  return {
    id: section.id,
    sectionId: section.id,
    label: section.label,
    lahrRef: `LAHR Appendix 2 §${section.id}`,
    status,
    cappedBand,
    triggeredRules: triggered,
    rationale,
    inputs: {},
  };
}

function highestAllowedBand(cappedBand: LahrBandId | null): LahrBandId {
  // "cap_band" is the worst band the section allows. Without triggers, the section is unconstrained
  // and we treat it as A. With a cap, the section can be no better than that cap.
  return cappedBand ?? "A";
}

export function classifyLahr(survey: Partial<SurveyRow> | null | undefined): LahrEvaluation {
  const env = buildRuleEnv(survey);
  const results = SECTIONS.map((s) => evaluateSection(s, env));

  // G-rules are informational only: surfaced as recommendations in the UI but
  // never forced to cap the overall band.
  const gResult = results.find((r) => r.id === G_SECTION_ID);
  const gTriggered = !!(gResult && gResult.triggeredRules.length > 0);

  const nonGResults = results.filter((r) => r.id !== G_SECTION_ID);

  // Aggregation per p. 28:
  // 1) Within main-access sections pick the lowest allowed band (main access band).
  // 2) Within second-exit sections pick the lowest (second exit band).
  // 3) Easiest access = higher of (main access, second exit) if a second exit exists.
  // 4) Easiest access vs. remaining sections -> lowest wins.
  const mainResults = nonGResults.filter((r) => MAIN_ACCESS_SECTIONS.has(r.id));
  const secondExitResults = nonGResults.filter((r) => SECOND_EXIT_SECTIONS.has(r.id));
  const otherResults = nonGResults.filter(
    (r) => !MAIN_ACCESS_SECTIONS.has(r.id) && !SECOND_EXIT_SECTIONS.has(r.id),
  );

  const worstOf = (list: CriterionResult[]): LahrBandId => {
    let worst: LahrBandId = "A";
    for (const r of list) {
      worst = lowerOf(worst, highestAllowedBand(r.cappedBand));
    }
    return worst;
  };

  const mainAccess = worstOf(mainResults);
  const hasSecondExit = env["SecondExitAccesstoStreet"] === "Yes";
  const secondExit = hasSecondExit ? worstOf(secondExitResults) : null;
  const easiestAccess = secondExit ? higherOf(mainAccess, secondExit) : mainAccess;

  let overall: LahrBandId = easiestAccess;
  for (const r of otherResults) {
    overall = lowerOf(overall, highestAllowedBand(r.cappedBand));
  }

  const confidence = nonGResults.every((r) => r.status !== "unknown") ? 1 : 0.5;

  return {
    band: overall,
    criteria: results,
    hardFails: results.filter((r) => r.status === "fail"),
    gTriggered,
    confidence,
  };
}

export { SECTIONS as LAHR_SECTIONS };
