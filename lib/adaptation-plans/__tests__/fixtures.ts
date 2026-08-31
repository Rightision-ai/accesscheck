import type { Database } from "@/types/supabase";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";
import { priceCandidate } from "@/lib/rate-cards/pricing";
import { triggeredRuleNumbers } from "@/lib/adaptation-plans/planner";
import type { AdaptationCandidate, CostRange } from "@/lib/adaptation-plans/types";

type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];

/**
 * A band E+ property with problems in six sections: no ramp to a three-step entrance, a narrow
 * hallway, no wheelchair storage, no accessible WC, a bath rather than a wet room, and a
 * kitchen with no turning circle. Rich enough that the three DFG tiers genuinely differ.
 */
export const BAND_E_PLUS_SURVEY: Partial<SurveyRow> = {
  has_internal_stairs: true,
  stair_70cm_clearance: false,
  stair_width_cm: 90,
  entrance_level: "Ground Floor",
  property_door_steps_count: 3,
  property_door_opening_width: 720,
  communal_door_steps_count: 0,
  has_property_ramp: false,
  has_communal_ramp: false,
  num_bedrooms: 3,
  num_bed_spaces: 4,
  has_wheelchair_storage: false,
  has_separate_toilet: false,
  bathroom_has_level_access_shower: false,
  bathroom_turning_150x150: false,
  kitchen_turning_150x150: false,
  kitchen_turning_170x140: false,
  hallway_width_head_on_cm: 90,
  hallway_width_turn_cm: 90,
  access_bathroom_no_toilet: false,
  access_bed1: false,
} as Partial<SurveyRow>;

/** Every national rate-card line, priced against a survey — the realistic pool shape. */
export function poolFor(survey: Partial<SurveyRow>): AdaptationCandidate[] {
  const card = nationalIndicativeCard();
  const triggeredRules = triggeredRuleNumbers(survey);
  return card.items.map((item) =>
    priceCandidate({ id: item.workItemCode, item, card, triggeredRules, raw: {} }),
  );
}

const FLAT_COST = (expected: number): CostRange => ({
  lowGbp: Math.round(expected * 0.8),
  expectedGbp: expected,
  highGbp: Math.round(expected * 1.3),
});

/** A hand-built candidate, for the cases the real card cannot express. */
export function candidate(
  overrides: Partial<AdaptationCandidate> & { id: string },
): AdaptationCandidate {
  const expected = overrides.cost?.expectedGbp ?? 1000;
  return {
    label: `Work ${overrides.id}`,
    addressesRules: [],
    cost: FLAT_COST(expected),
    costBasis: {
      workItemCode: overrides.id,
      quantity: 1,
      unit: "each",
      rateCardId: null,
      rateCardLabel: "National indicative — obtain quote",
      regionMultiplier: 1,
      effectiveFrom: "2026-04-01",
    },
    durationDays: 1,
    difficulty: "minor",
    trades: ["carpentry"],
    confidence: { score: 0.7, basis: "rate_card_match", verifyOnSite: false },
    fieldPatches: {},
    feasibility: "feasible",
    dependsOn: [],
    ...overrides,
  };
}

/** Deterministic pseudo-random source — never Math.random in a test. */
export function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
