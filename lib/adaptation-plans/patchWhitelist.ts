import fieldMapping from "@/lib/accessibility/lahr/tables/field-mapping.json";
import { RULE_RECIPES } from "./ruleRecipes";

/**
 * The set of `surveys` columns an adaptation may patch.
 *
 * This used to be derived from `field-mapping.json` `column` entries alone, which produced a
 * list that contradicted the recipe map the same prompt declared mandatory. Ten live columns
 * were missing — every ramp gradient input (`*_ramp_ah` / `*_ramp_al`, expressed as
 * `derived_from` rather than `column`), all three `*_ramp_type` columns and
 * `has_level_access_shower` (read by `buildRuleEnv` but absent from the mapping). The model was
 * told both "you must emit these keys" and "never emit a key outside this list", so ramp
 * adaptations could never move a gradient and the band never shifted.
 *
 * `field-mapping.json` is documentation; `buildRuleEnv` in `lib/accessibility/lahr/env.ts` is
 * the runtime truth, and the two can drift. So the whitelist is the union of every source that
 * claims a column is patchable, and `__tests__/patchWhitelist.test.ts` asserts every member is
 * actually read by `buildRuleEnv` — which is what catches a dead key rather than silently
 * whitelisting it.
 */
function collectPatchableColumns(): ReadonlySet<string> {
  const mapping = (fieldMapping as { mapping: Record<string, unknown> }).mapping;
  const columns = new Set<string>();

  for (const value of Object.values(mapping)) {
    if (typeof value === "string") {
      if (!value.startsWith("$")) columns.add(value);
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const entry = value as {
      column?: unknown;
      fallback_column?: unknown;
      derived_from?: unknown;
    };
    if (typeof entry.column === "string") columns.add(entry.column);
    if (typeof entry.fallback_column === "string") columns.add(entry.fallback_column);
    if (Array.isArray(entry.derived_from)) {
      for (const derived of entry.derived_from) {
        if (typeof derived === "string") columns.add(derived);
      }
    }
  }

  for (const recipe of RULE_RECIPES) {
    for (const key of Object.keys(recipe.patches)) columns.add(key);
  }

  return columns;
}

export const PATCHABLE_COLUMNS: ReadonlySet<string> = collectPatchableColumns();

/** Comma-separated column list for the prompt's "Patchable survey fields" block. */
export function buildPatchableFieldsBlock(): string {
  return Array.from(PATCHABLE_COLUMNS).sort().join(", ");
}

export function isPatchableColumn(column: string): boolean {
  return PATCHABLE_COLUMNS.has(column);
}
