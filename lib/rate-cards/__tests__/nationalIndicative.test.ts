import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import businessRules from "@/lib/accessibility/lahr/tables/business-rules.json";
import { buildRuleEnv } from "@/lib/accessibility/lahr/env";
import { PATCHABLE_COLUMNS } from "@/lib/adaptation-plans/patchWhitelist";
import {
  NATIONAL_INDICATIVE_ITEMS,
  nationalIndicativeCard,
  type SeedItem,
} from "@/lib/rate-cards/nationalIndicative";
import { RATE_CARD_UNITS } from "@/lib/rate-cards/types";

const MIGRATION = resolve(
  import.meta.dirname,
  "../../../supabase/migrations/20260901120000_add_rate_cards.sql",
);

const ruleNumbers = new Set(
  (businessRules as { sections: { rules: { n: number }[] }[] }).sections.flatMap(
    (section) => section.rules.map((rule) => rule.n),
  ),
);

describe("national indicative rate card", () => {
  it("keeps costs and durations ordered", () => {
    for (const item of NATIONAL_INDICATIVE_ITEMS) {
      expect(item.rateLowGbp, item.workItemCode).toBeLessThanOrEqual(item.rateExpectedGbp);
      expect(item.rateExpectedGbp, item.workItemCode).toBeLessThanOrEqual(item.rateHighGbp);
      expect(item.rateLowGbp, item.workItemCode).toBeGreaterThan(0);
      expect(item.durationDaysLow, item.workItemCode).toBeLessThanOrEqual(
        item.durationDaysExpected,
      );
      expect(item.durationDaysExpected, item.workItemCode).toBeLessThanOrEqual(
        item.durationDaysHigh,
      );
    }
  });

  it("has unique work item codes and valid enums", () => {
    const codes = NATIONAL_INDICATIVE_ITEMS.map((item) => item.workItemCode);

    expect(new Set(codes).size).toBe(codes.length);
    for (const item of NATIONAL_INDICATIVE_ITEMS) {
      expect(RATE_CARD_UNITS, item.workItemCode).toContain(item.unit);
      expect(["minor", "moderate", "major"], item.workItemCode).toContain(item.difficulty);
      expect(item.trades.length, item.workItemCode).toBeGreaterThan(0);
    }
  });

  it("only references rules that exist", () => {
    const unknown = NATIONAL_INDICATIVE_ITEMS.flatMap((item) =>
      item.addressesRuleNumbers
        .filter((n) => !ruleNumbers.has(n))
        .map((n) => `${item.workItemCode}: rule ${n}`),
    );

    expect(unknown).toEqual([]);
  });

  it("only patches columns the classifier reads", () => {
    // Same bar the rule recipes must clear: a patch key that moves no RuleEnv variable is a
    // priced line that can never clear anything.
    const before = buildRuleEnv({}) as unknown as Record<string, unknown>;
    const offenders: string[] = [];

    for (const item of NATIONAL_INDICATIVE_ITEMS) {
      for (const column of Object.keys(item.fieldPatches)) {
        if (!PATCHABLE_COLUMNS.has(column)) {
          offenders.push(`${item.workItemCode}: ${column} not whitelisted`);
        }
      }
      const after = buildRuleEnv(item.fieldPatches as never) as unknown as Record<
        string,
        unknown
      >;
      const moved = Object.keys({ ...before, ...after }).some(
        (key) => !Object.is(before[key], after[key]),
      );
      if (!moved) offenders.push(`${item.workItemCode}: patches move nothing`);
    }

    expect(offenders).toEqual([]);
  });

  it("carries the corrections to the 2026-04 catalogue", () => {
    const byCode = nationalIndicativeCard().itemsByCode;

    // Dropped keys — each could never affect a classification.
    expect(byCode.get("stair_lift_straight")?.fieldPatches).not.toHaveProperty("has_stair_lift");
    expect(byCode.get("stair_lift_curved")?.fieldPatches).not.toHaveProperty("has_stair_lift");
    expect(byCode.get("kitchen_reconfiguration")?.fieldPatches).not.toHaveProperty(
      "kitchen_wheelchair_accessible",
    );
    // Rule 87 is unreachable while env.ts hardcodes InternalSteps: 0.
    expect(byCode.has("internal_steps_leveller")).toBe(false);
    // Ramp rules the original catalogue omitted.
    expect(byCode.get("ramp_retrofit_property")?.addressesRuleNumbers).toEqual(
      expect.arrayContaining([3, 4, 6]),
    );
    expect(byCode.get("ramp_retrofit_communal")?.addressesRuleNumbers).toEqual(
      expect.arrayContaining([3, 4, 5]),
    );
  });

  it("matches the SQL seed element for element", () => {
    // The TS constant and the migration are two copies of the same data. Nothing but this test
    // stops them drifting the moment one of them is edited.
    expect(parseSeedFromMigration()).toEqual(
      NATIONAL_INDICATIVE_ITEMS.map((item) => ({ ...item })),
    );
  });
});

/** Parse the `VALUES` tuples out of the rate-card migration. */
function parseSeedFromMigration(): SeedItem[] {
  const sql = readFileSync(MIGRATION, "utf8");
  const block = sql.slice(
    sql.indexOf("CROSS JOIN (VALUES") + "CROSS JOIN (VALUES".length,
    sql.indexOf(") AS seed ("),
  );

  return splitTopLevel(block, "(")
    .map((tuple) => splitTopLevel(tuple, ","))
    .map((fields) => {
      const [
        code,
        description,
        unit,
        low,
        expected,
        high,
        durLow,
        durExpected,
        durHigh,
        difficulty,
        trades,
        rules,
        preconditions,
        patches,
        priority,
      ] = fields;
      return {
        workItemCode: text(code),
        description: text(description),
        unit: text(unit) as SeedItem["unit"],
        rateLowGbp: Number(low),
        rateExpectedGbp: Number(expected),
        rateHighGbp: Number(high),
        durationDaysLow: Number(durLow),
        durationDaysExpected: Number(durExpected),
        durationDaysHigh: Number(durHigh),
        difficulty: text(difficulty) as SeedItem["difficulty"],
        trades: arrayLiteral(trades).map(text),
        addressesRuleNumbers: arrayLiteral(rules).map(Number),
        preconditions: preconditions.trim() === "NULL" ? null : text(preconditions),
        fieldPatches: JSON.parse(text(patches)) as Record<string, unknown>,
        priorityHint: Number(priority),
      };
    });
}

/** Split on `separator` (or on balanced parens when separator is "("), respecting quotes. */
function splitTopLevel(source: string, separator: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  let inQuote = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "'" && source[i + 1] === "'") {
      current += "''";
      i++;
      continue;
    }
    if (char === "'") inQuote = !inQuote;
    if (!inQuote) {
      if (char === "(" || char === "[") {
        depth++;
        if (separator === "(" && depth === 1) {
          current = "";
          continue;
        }
      } else if (char === ")" || char === "]") {
        depth--;
        if (separator === "(" && depth === 0) {
          out.push(current);
          continue;
        }
      } else if (char === separator && depth === 0 && separator !== "(") {
        out.push(current);
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (separator !== "(") out.push(current);
  return out;
}

function text(raw: string): string {
  const trimmed = raw.trim().replace(/::\w+(\[\])?$/, "");
  return trimmed.slice(1, -1).replace(/''/g, "'");
}

function arrayLiteral(raw: string): string[] {
  const trimmed = raw.trim().replace(/::\w+(\[\])?$/, "");
  const inner = trimmed.slice(trimmed.indexOf("[") + 1, trimmed.lastIndexOf("]")).trim();
  return inner === "" ? [] : splitTopLevel(inner, ",");
}
