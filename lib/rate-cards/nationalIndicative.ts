import { indexByCode, type RateCard, type RateCardItem } from "./types";

/**
 * The national indicative rate card.
 *
 * Revived from the `adaptation_catalogue` seeded by migration
 * `20260424120000_add_cost_estimation.sql` and dropped by `20260425120000`. When that table
 * went, the cost bands went with it and pricing became entirely model-invented — a number
 * nobody could trace back to a rate, a region or a date.
 *
 * Three deliberate corrections to the original seed, each because the patch could never affect
 * a classification (see `lib/adaptation-plans/__tests__/patchWhitelist.test.ts`):
 *
 * - `has_stair_lift` dropped from both stair-lift items — `buildRuleEnv` reads only
 *   `has_platform_stair_lift`.
 * - `kitchen_wheelchair_accessible` dropped from the kitchen item — never read at all; rule 79
 *   turns on the two turning-circle booleans.
 * - `internal_steps_leveller` omitted entirely — rule 87 is unreachable while `env.ts`
 *   hardcodes `InternalSteps: 0`.
 *
 * Rules 3/4/5/6 were added to the ramp items: the ramp patches resolve them, but the original
 * catalogue omitted them from the rule lists. Mirrors `lib/adaptation-plans/ruleRecipes.ts`.
 *
 * These ranges are INDICATIVE and carried forward from an April 2026 catalogue. They are
 * structurally tested, not price-checked — a human must sign them off before a pilot, and an
 * authority's own schedule of rates supersedes them once uploaded.
 *
 * Kept in sync with the SQL seed by `__tests__/nationalIndicative.test.ts`, which parses the
 * migration and compares element for element.
 */
export const NATIONAL_INDICATIVE_CODE = "national-indicative-2026-04";
export const NATIONAL_INDICATIVE_LABEL = "National indicative — obtain quote";
export const NATIONAL_INDICATIVE_EFFECTIVE_FROM = "2026-04-01";

export type SeedItem = Omit<
  RateCardItem,
  "id" | "sourceLabel" | "rateCardId" | "effectiveFrom"
>;

export const NATIONAL_INDICATIVE_ITEMS: readonly SeedItem[] = [
  {
    workItemCode: "threshold_ramp",
    description: "Install modular threshold ramp at entrance",
    unit: "each",
    rateLowGbp: 250,
    rateExpectedGbp: 450,
    rateHighGbp: 900,
    durationDaysLow: 1,
    durationDaysExpected: 1,
    durationDaysHigh: 1,
    difficulty: "minor",
    trades: ["carpentry"],
    addressesRuleNumbers: [7, 8, 27, 28],
    preconditions: "Threshold <=10cm and door clearance for ramp lip.",
    fieldPatches: { "communal_door_threshold_height": "Level", "property_door_threshold_height": "Level" },
    priorityHint: 10,
  },
  {
    workItemCode: "handrail_install",
    description: "Install stair handrails (both sides) and 70cm clearance",
    unit: "each",
    rateLowGbp: 180,
    rateExpectedGbp: 350,
    rateHighGbp: 700,
    durationDaysLow: 1,
    durationDaysExpected: 1,
    durationDaysHigh: 1,
    difficulty: "minor",
    trades: ["carpentry"],
    addressesRuleNumbers: [85, 86],
    preconditions: "Existing stairs with structurally sound walls.",
    fieldPatches: { "stair_70cm_clearance": true },
    priorityHint: 20,
  },
  {
    workItemCode: "door_widening_entry",
    description: "Widen entrance door(s) to 85cm+",
    unit: "each",
    rateLowGbp: 800,
    rateExpectedGbp: 1800,
    rateHighGbp: 3500,
    durationDaysLow: 1,
    durationDaysExpected: 2,
    durationDaysHigh: 3,
    difficulty: "moderate",
    trades: ["carpentry", "plastering"],
    addressesRuleNumbers: [25, 26, 42, 43],
    preconditions: "Non-load-bearing door frame; re-hang with wider leaf.",
    fieldPatches: { "communal_door_opening_width": 85, "property_door_opening_width": 85, "second_exit_door_width": 85 },
    priorityHint: 30,
  },
  {
    workItemCode: "door_widening_internal",
    description: "Widen internal doors (bedrooms, bathroom, kitchen) to 80cm+",
    unit: "each",
    rateLowGbp: 2500,
    rateExpectedGbp: 5000,
    rateHighGbp: 9000,
    durationDaysLow: 2,
    durationDaysExpected: 4,
    durationDaysHigh: 7,
    difficulty: "moderate",
    trades: ["carpentry", "plastering", "decorating"],
    addressesRuleNumbers: [77, 78],
    preconditions: "Non-load-bearing frames; typically 5–7 doors per property.",
    fieldPatches: { "door_width_bed1": 80, "door_width_bed2": 80, "door_width_bed3": 80, "door_width_bathroom": 80, "door_width_kitchen": 80, "door_width_living_room": 80, "door_width_separate_toilet": 80 },
    priorityHint: 40,
  },
  {
    workItemCode: "ramp_retrofit_property",
    description: "Install property-entrance ramp (1:15, adequate platform)",
    unit: "each",
    rateLowGbp: 1800,
    rateExpectedGbp: 3500,
    rateHighGbp: 6500,
    durationDaysLow: 1,
    durationDaysExpected: 2,
    durationDaysHigh: 4,
    difficulty: "moderate",
    trades: ["groundworks", "carpentry"],
    addressesRuleNumbers: [2, 3, 4, 6, 17, 18, 19, 20, 21, 22, 23, 24, 93, 101, 104, 107],
    preconditions: "At least 3m clear run-out outside the property door.",
    fieldPatches: { "has_property_ramp": true, "property_ramp_ah": 10, "property_ramp_al": 200, "property_ramp_adequate_platform": true, "property_ramp_type": "Straight" },
    priorityHint: 50,
  },
  {
    workItemCode: "ramp_retrofit_communal",
    description: "Install communal-entrance ramp (1:15, adequate platform)",
    unit: "each",
    rateLowGbp: 2500,
    rateExpectedGbp: 5000,
    rateHighGbp: 9000,
    durationDaysLow: 2,
    durationDaysExpected: 4,
    durationDaysHigh: 7,
    difficulty: "major",
    trades: ["groundworks", "carpentry", "building_control"],
    addressesRuleNumbers: [1, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 92, 100, 103, 106],
    preconditions: "Consent required from freeholder / housing association.",
    fieldPatches: { "has_communal_ramp": true, "communal_ramp_ah": 10, "communal_ramp_al": 200, "communal_ramp_adequate_platform": true, "communal_ramp_type": "Straight" },
    priorityHint: 55,
  },
  {
    workItemCode: "second_exit_ramp_retrofit",
    description: "Install / retrofit second-exit ramp",
    unit: "each",
    rateLowGbp: 2000,
    rateExpectedGbp: 3800,
    rateHighGbp: 6800,
    durationDaysLow: 2,
    durationDaysExpected: 3,
    durationDaysHigh: 5,
    difficulty: "moderate",
    trades: ["groundworks", "carpentry"],
    addressesRuleNumbers: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 94, 102, 105, 108],
    preconditions: "Existing second exit with usable outdoor run-out.",
    fieldPatches: { "has_ramped_second_exit": true, "second_exit_ramp_ah": 10, "second_exit_ramp_al": 200, "second_exit_ramp_platform": true, "second_exit_ramp_type": "Straight" },
    priorityHint: 60,
  },
  {
    workItemCode: "stair_lift_straight",
    description: "Install straight stair-lift",
    unit: "each",
    rateLowGbp: 1500,
    rateExpectedGbp: 3200,
    rateHighGbp: 5500,
    durationDaysLow: 1,
    durationDaysExpected: 1,
    durationDaysHigh: 2,
    difficulty: "minor",
    trades: ["specialist_lift"],
    addressesRuleNumbers: [44, 45],
    preconditions: "Straight single-flight stairs with clear side fixing.",
    fieldPatches: { "has_platform_stair_lift": true },
    priorityHint: 70,
  },
  {
    workItemCode: "stair_lift_curved",
    description: "Install curved / turning stair-lift",
    unit: "each",
    rateLowGbp: 3500,
    rateExpectedGbp: 7000,
    rateHighGbp: 12000,
    durationDaysLow: 2,
    durationDaysExpected: 3,
    durationDaysHigh: 5,
    difficulty: "moderate",
    trades: ["specialist_lift"],
    addressesRuleNumbers: [44, 45],
    preconditions: "Curved / winding stairs — bespoke rail required.",
    fieldPatches: { "has_platform_stair_lift": true },
    priorityHint: 75,
  },
  {
    workItemCode: "wheelchair_storage_create",
    description: "Create internal wheelchair / scooter storage area",
    unit: "each",
    rateLowGbp: 600,
    rateExpectedGbp: 1400,
    rateHighGbp: 3200,
    durationDaysLow: 1,
    durationDaysExpected: 2,
    durationDaysHigh: 4,
    difficulty: "moderate",
    trades: ["carpentry", "electrical"],
    addressesRuleNumbers: [53, 54, 55, 56, 57, 58, 59],
    preconditions: "Available hallway / under-stair / porch footprint.",
    fieldPatches: { "has_wheelchair_storage": true, "wheelchair_storage_dim_width": 160, "wheelchair_storage_dim_depth": 100 },
    priorityHint: 80,
  },
  {
    workItemCode: "accessible_wc_install",
    description: "Install ground-floor accessible WC with lateral transfer space",
    unit: "each",
    rateLowGbp: 1500,
    rateExpectedGbp: 3200,
    rateHighGbp: 5500,
    durationDaysLow: 2,
    durationDaysExpected: 4,
    durationDaysHigh: 7,
    difficulty: "moderate",
    trades: ["plumbing", "carpentry", "tiling"],
    addressesRuleNumbers: [60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 73],
    preconditions: "Spare floorspace ≈ 2.0 × 1.7m adjacent to soil stack.",
    fieldPatches: { "has_separate_toilet": true, "toilet_dim_width": 200, "toilet_dim_depth": 170, "toilet_lateral_space_cm": 100, "bathroom_toilet_lateral_space": 100, "access_separate_toilet": true },
    priorityHint: 90,
  },
  {
    workItemCode: "wet_room_conversion",
    description: "Convert bathroom to level-access wet room with 150cm turning",
    unit: "each",
    rateLowGbp: 5500,
    rateExpectedGbp: 8500,
    rateHighGbp: 14000,
    durationDaysLow: 5,
    durationDaysExpected: 7,
    durationDaysHigh: 12,
    difficulty: "major",
    trades: ["plumbing", "tiling", "waterproofing", "electrical"],
    addressesRuleNumbers: [64, 71, 72],
    preconditions: "Bathroom footprint ≥ 2.5m²; suitable drainage falls.",
    fieldPatches: { "bathroom_has_level_access_shower": true, "has_level_access_shower": true, "bathroom_turning_150x150": true, "bathroom_toilet_lateral_space": 100 },
    priorityHint: 95,
  },
  {
    workItemCode: "hallway_widening",
    description: "Widen hallway / remove intrusions to 120cm",
    unit: "each",
    rateLowGbp: 2500,
    rateExpectedGbp: 5500,
    rateHighGbp: 10000,
    durationDaysLow: 4,
    durationDaysExpected: 7,
    durationDaysHigh: 14,
    difficulty: "major",
    trades: ["carpentry", "plastering", "structural"],
    addressesRuleNumbers: [74, 75, 76, 89],
    preconditions: "Non-load-bearing partition; utilities reroutable.",
    fieldPatches: { "hallway_width_head_on_cm": 120, "hallway_width_turn_cm": 120 },
    priorityHint: 100,
  },
  {
    workItemCode: "kitchen_reconfiguration",
    description: "Reconfigure kitchen for 150 × 150cm turning circle",
    unit: "each",
    rateLowGbp: 4500,
    rateExpectedGbp: 8500,
    rateHighGbp: 15000,
    durationDaysLow: 5,
    durationDaysExpected: 10,
    durationDaysHigh: 15,
    difficulty: "major",
    trades: ["joinery", "plumbing", "electrical"],
    addressesRuleNumbers: [79],
    preconditions: "Sufficient floor area to remove peninsula / intruding units.",
    fieldPatches: { "kitchen_turning_150x150": true, "kitchen_turning_170x140": true },
    priorityHint: 105,
  },
  {
    workItemCode: "through_floor_lift",
    description: "Install through-floor lift (access to upper storey)",
    unit: "each",
    rateLowGbp: 9500,
    rateExpectedGbp: 15500,
    rateHighGbp: 24000,
    durationDaysLow: 5,
    durationDaysExpected: 7,
    durationDaysHigh: 14,
    difficulty: "major",
    trades: ["specialist_lift", "carpentry", "structural", "building_control"],
    addressesRuleNumbers: [44, 45, 46, 47, 48],
    preconditions: "Vertical void available; ceiling / floor joists permit aperture.",
    fieldPatches: { "has_through_floor_lift": true, "through_floor_lift_dim_width": 110, "through_floor_lift_dim_depth": 75 },
    priorityHint: 110,
  },
];

/** The built-in fallback used when the database has no card for the organisation. */
export function nationalIndicativeCard(): RateCard {
  const items: RateCardItem[] = NATIONAL_INDICATIVE_ITEMS.map((item) => ({
    ...item,
    id: item.workItemCode,
    sourceLabel: NATIONAL_INDICATIVE_LABEL,
    rateCardId: null,
    effectiveFrom: NATIONAL_INDICATIVE_EFFECTIVE_FROM,
  }));
  return {
    id: null,
    organisationId: null,
    code: NATIONAL_INDICATIVE_CODE,
    label: NATIONAL_INDICATIVE_LABEL,
    version: null,
    ownedCardId: null,
    regionMultiplier: 1,
    effectiveFrom: NATIONAL_INDICATIVE_EFFECTIVE_FROM,
    items,
    itemsByCode: indexByCode(items),
  };
}
