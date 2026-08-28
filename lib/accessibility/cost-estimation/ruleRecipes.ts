/**
 * Rule → minimum-patch lookup. Without this Gemini guesses which `surveys` columns to patch
 * to resolve a triggered LAHR rule and frequently misses (e.g. patches `has_property_ramp:true`
 * but forgets the gradient values, so the gradient-rule still trips). The result is an
 * Adaptation plan that doesn't actually lift the band.
 *
 * Each entry is a NAMED group of related fields that together resolve a family of rules.
 * Multiple groups can address overlapping rule sets — that's fine, the prompt lists all
 * matching groups and Gemini picks the appropriate ones based on the property's reality.
 *
 * Source: the v1 catalogue seeded by migration 20260424120000_add_cost_estimation.sql, which
 * was hand-validated against the LAHR business rules. We keep this in TypeScript so changes
 * stay close to the rest of the cost-estimation pipeline.
 */

export type Recipe = {
  /** Short human label — shown to Gemini so it understands what kind of work this is. */
  label: string;
  /** Rule numbers this group resolves (closing the cap caused by these triggers). */
  rules: number[];
  /** Minimum set of `surveys` columns + post-adaptation values. Gemini must include at least
   *  these keys in its `field_patches` for an adaptation that addresses any of `rules`. */
  patches: Record<string, unknown>;
  /** Optional one-liner shown to Gemini explaining when this is *not* feasible. */
  preconditions?: string;
};

export const RULE_RECIPES: Recipe[] = [
  {
    label: "Lower entrance threshold",
    rules: [7, 8, 27, 28],
    patches: {
      communal_door_threshold_height: "Level",
      property_door_threshold_height: "Level",
    },
  },
  {
    label: "Add stair handrails / 70cm clearance",
    rules: [85, 86],
    patches: { stair_70cm_clearance: true },
    preconditions: "Existing stairs with structurally sound walls.",
  },
  {
    label: "Widen entrance doors (≥85cm)",
    rules: [25, 26, 42, 43],
    patches: {
      communal_door_opening_width: 85,
      property_door_opening_width: 85,
      second_exit_door_width: 85,
    },
  },
  {
    label: "Widen internal doors (≥80cm)",
    rules: [77, 78],
    patches: {
      door_width_bed1: 80,
      door_width_bed2: 80,
      door_width_bed3: 80,
      door_width_bathroom: 80,
      door_width_kitchen: 80,
      door_width_living_room: 80,
      door_width_separate_toilet: 80,
    },
  },
  {
    label: "Property-entrance ramp (1:15 with platform)",
    rules: [2, 17, 18, 19, 20, 21, 22, 23, 24, 93, 101, 104, 107],
    patches: {
      has_property_ramp: true,
      property_ramp_ah: 10,
      property_ramp_al: 200,
      property_ramp_adequate_platform: true,
      property_ramp_type: "Straight",
    },
    preconditions: "At least 3m clear run-out outside the property door.",
  },
  {
    label: "Communal-entrance ramp (1:15 with platform)",
    rules: [1, 9, 10, 11, 12, 13, 14, 15, 16, 92, 100, 103, 106],
    patches: {
      has_communal_ramp: true,
      communal_ramp_ah: 10,
      communal_ramp_al: 200,
      communal_ramp_adequate_platform: true,
      communal_ramp_type: "Straight",
    },
    preconditions: "Consent required from freeholder / housing association.",
  },
  {
    label: "Second-exit ramp",
    rules: [
      29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 94, 102, 105, 108,
    ],
    patches: {
      has_ramped_second_exit: true,
      second_exit_ramp_ah: 10,
      second_exit_ramp_al: 200,
      second_exit_ramp_platform: true,
      second_exit_ramp_type: "Straight",
    },
    preconditions: "Existing second exit with usable outdoor run-out.",
  },
  {
    label: "Stair lift / platform stair lift",
    rules: [44, 45],
    patches: { has_platform_stair_lift: true, has_stair_lift: true },
    preconditions:
      "Stairs suitable for rail mounting (single flight or curved bespoke).",
  },
  {
    label: "Wheelchair / scooter storage",
    rules: [53, 54, 55, 56, 57, 58, 59],
    patches: {
      has_wheelchair_storage: true,
      wheelchair_storage_dim_width: 160,
      wheelchair_storage_dim_depth: 100,
    },
    preconditions: "Available hallway / under-stair / porch footprint.",
  },
  {
    label: "Accessible WC with lateral transfer space",
    rules: [60, 61, 62, 63, 65, 66, 67, 68, 69, 70, 73],
    patches: {
      has_separate_toilet: true,
      toilet_dim_width: 200,
      toilet_dim_depth: 170,
      toilet_lateral_space_cm: 100,
      bathroom_toilet_lateral_space: 100,
      access_separate_toilet: true,
    },
    preconditions: "Spare floor-space ≈ 2.0 × 1.7m adjacent to soil stack.",
  },
  {
    label: "Wet room with 150cm turning",
    rules: [64, 71, 72],
    patches: {
      bathroom_has_level_access_shower: true,
      has_level_access_shower: true,
      bathroom_turning_150x150: true,
      bathroom_toilet_lateral_space: 100,
    },
    preconditions: "Bathroom footprint ≥ 2.5m²; suitable drainage falls.",
  },
  {
    label: "Hallway widening (≥120cm)",
    rules: [74, 75, 76, 89],
    patches: {
      hallway_width_head_on_cm: 120,
      hallway_width_turn_cm: 120,
    },
    preconditions: "Non-load-bearing partition; utilities reroutable.",
  },
  {
    label: "Kitchen turning circle (150 × 150cm)",
    rules: [79],
    patches: {
      kitchen_turning_150x150: true,
      kitchen_turning_170x140: true,
      kitchen_wheelchair_accessible: true,
    },
  },
  {
    label: "Through-floor lift",
    rules: [44, 45, 46, 47, 48],
    patches: {
      has_through_floor_lift: true,
      through_floor_lift_dim_width: 110,
      through_floor_lift_dim_depth: 75,
    },
    preconditions:
      "Vertical void available; floor / ceiling joists permit aperture.",
  },
  {
    label: "Remove internal floor-level changes",
    rules: [87],
    patches: { internal_steps_count: 0 },
  },
];

/** Build a `rule_number → Recipe[]` index for O(1) lookups. */
const BY_RULE: Map<number, Recipe[]> = (() => {
  const m = new Map<number, Recipe[]>();
  for (const r of RULE_RECIPES) {
    for (const n of r.rules) {
      const list = m.get(n) ?? [];
      list.push(r);
      m.set(n, list);
    }
  }
  return m;
})();

export function recipesForRule(n: number): Recipe[] {
  return BY_RULE.get(n) ?? [];
}

/**
 * Render a compact prompt block that, for each triggered rule, embeds the matching recipes.
 * The model sees both the rule description and the exact set of column names + values it
 * needs to put into `field_patches` to flip the rule.
 */
export function buildResolutionsBlock(
  triggeredRules: {
    n: number;
    capBand: string;
    sectionLabel: string;
    description: string;
  }[],
): string {
  if (triggeredRules.length === 0)
    return "  (none — no rules currently capping the band)";
  return triggeredRules
    .map((r) => {
      const recipes = recipesForRule(r.n);
      const head = `  - Rule #${r.n} (section "${r.sectionLabel}", caps at ${r.capBand}): ${r.description}`;
      if (recipes.length === 0) {
        return `${head}\n      (No standard recipe — patch the closest related fields and explain the reasoning in narrative.)`;
      }
      const lines = recipes.map((rec) => {
        const pre = rec.preconditions
          ? ` [requires: ${rec.preconditions}]`
          : "";
        return `      • To resolve via "${rec.label}"${pre}: field_patches must include ${JSON.stringify(rec.patches)}`;
      });
      return `${head}\n${lines.join("\n")}`;
    })
    .join("\n");
}
