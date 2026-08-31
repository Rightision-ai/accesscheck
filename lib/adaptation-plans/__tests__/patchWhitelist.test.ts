import { describe, expect, it } from "vitest";
import { buildRuleEnv } from "@/lib/accessibility/lahr/env";
import {
  PATCHABLE_COLUMNS,
  buildPatchableFieldsBlock,
} from "@/lib/adaptation-plans/patchWhitelist";
import { RULE_RECIPES } from "@/lib/adaptation-plans/ruleRecipes";

function env(patches: Record<string, unknown>): Record<string, unknown> {
  return buildRuleEnv(patches as never) as unknown as Record<string, unknown>;
}

function differs(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return Object.keys({ ...a, ...b }).some((key) => !Object.is(a[key], b[key]));
}

/** Whether patching this column on its own moves any RuleEnv variable. */
function movesAlone(column: string, value: unknown): boolean {
  return differs(env({}), env({ [column]: value }));
}

/** Whether dropping this column from its recipe changes the resulting RuleEnv. */
function contributes(patches: Record<string, unknown>, column: string): boolean {
  const without = { ...patches };
  delete without[column];
  return differs(env(patches), env(without));
}

/**
 * A recipe column earns its place if it moves the classifier on its own OR if removing it from
 * its recipe changes the outcome. Both arms are needed:
 *
 * - A ramp's `*_ah` moves nothing alone — the gradient is `(ah / al) * 100` and needs both
 *   halves — but removing it from the recipe drops the gradient, so it contributes.
 * - `has_level_access_shower` and `bathroom_has_level_access_shower` are an alias pair
 *   (`LevelAccessShower` falls back from one to the other), so neither contributes once the
 *   other is present, but each moves the classifier alone.
 *
 * A column failing both arms is genuinely dead.
 */
function isLive(patches: Record<string, unknown>, column: string): boolean {
  return movesAlone(column, patches[column]) || contributes(patches, column);
}

const recipePatches = RULE_RECIPES.flatMap((recipe) =>
  Object.keys(recipe.patches).map((column) => ({
    recipe: recipe.label,
    patches: recipe.patches,
    column,
  })),
);

describe("patch whitelist", () => {
  it("admits every column the rule recipes declare mandatory", () => {
    const missing = recipePatches
      .filter(({ column }) => !PATCHABLE_COLUMNS.has(column))
      .map(({ recipe, column }) => `${recipe}: ${column}`);

    expect(missing).toEqual([]);
  });

  it("admits the ramp and shower columns the mapping-derived list was dropping", () => {
    // These are the live columns the old `.column`-only derivation missed. Ramp gradient
    // inputs are `derived_from` entries; the ramp types and has_level_access_shower are read
    // by buildRuleEnv but were absent from field-mapping.json entirely.
    for (const column of [
      "property_ramp_ah",
      "property_ramp_al",
      "property_ramp_type",
      "communal_ramp_ah",
      "communal_ramp_al",
      "communal_ramp_type",
      "second_exit_ramp_ah",
      "second_exit_ramp_al",
      "second_exit_ramp_type",
      "has_level_access_shower",
    ]) {
      expect(PATCHABLE_COLUMNS.has(column), `${column} is not patchable`).toBe(true);
      expect(buildPatchableFieldsBlock()).toContain(column);
    }
  });

  it("makes ramp gradient patches reach the classifier", () => {
    // The end of the chain the old whitelist broke: 10cm rise over 200cm run is 1:20, well
    // inside the 1:15 the ramp rules require.
    expect(
      env({ property_ramp_ah: 10, property_ramp_al: 200 }).PropertyRampGradient,
    ).toBe(5);
  });

  it("carries no recipe column the classifier ignores", () => {
    // field-mapping.json is documentation; buildRuleEnv is the runtime truth, and the two
    // drift. A recipe key that changes no RuleEnv variable is dead weight the prompt trains
    // the model to emit for nothing — this is what caught has_stair_lift (buildRuleEnv reads
    // only has_platform_stair_lift) and kitchen_wheelchair_accessible (never read at all).
    const dead = recipePatches
      .filter(({ patches, column }) => !isLive(patches, column))
      .map(({ recipe, column }) => `${recipe}: ${column}`);

    expect(dead).toEqual([]);
  });

  it("flags a dead key if one is added back", () => {
    // Guards the guard: without this, a bug in `contributes` would make the test above pass
    // vacuously and let dead keys back in.
    expect(isLive({ has_platform_stair_lift: true }, "has_platform_stair_lift")).toBe(true);
    expect(
      isLive({ has_platform_stair_lift: true, has_stair_lift: true }, "has_stair_lift"),
    ).toBe(false);
    expect(isLive({ kitchen_turning_150x150: true, kitchen_wheelchair_accessible: true }, "kitchen_wheelchair_accessible")).toBe(false);
  });

  it("has no recipe targeting internal_steps_count", () => {
    // Rule 87 is unreachable while env.ts hardcodes InternalSteps: 0, and internal_steps_count
    // is the stair step count driving rules 44-48. Patching it would resolve nothing and
    // misrepresent the stairs.
    const offenders = recipePatches.filter(
      ({ column }) => column === "internal_steps_count",
    );

    expect(offenders).toEqual([]);
  });
});
