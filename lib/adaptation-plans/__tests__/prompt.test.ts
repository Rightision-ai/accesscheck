import { describe, expect, it } from "vitest";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import {
  ADAPTATION_POOL_RESPONSE_SCHEMA,
  buildAdaptationPoolPrompt,
  collectTriggeredRules,
} from "@/lib/engine/prompts/adaptationPoolPrompt";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";
import { BAND_E_PLUS_SURVEY } from "./fixtures";

const card = nationalIndicativeCard();
const evaluation = classifyLahr(BAND_E_PLUS_SURVEY);
const prompt = buildAdaptationPoolPrompt({
  currentBand: evaluation.band,
  triggeredRules: collectTriggeredRules(evaluation),
  workItems: card.items,
});

describe("adaptation pool prompt", () => {
  it("asks for a flat pool, never for tiers or budgets", () => {
    // Every one of these was in the old prompt and is arithmetic the selector now does exactly.
    for (const banned of [
      /£15,000/,
      /£20,000/,
      /£30,000/,
      /cumulative/i,
      /COPIED FROM/i,
      /total_cost_gbp/,
      /tier_unavailable_reason/,
      /potential_band_estimate/,
    ]) {
      expect(prompt, String(banned)).not.toMatch(banned);
    }
    expect(prompt).toMatch(/one flat list/i);
  });

  it("never mentions field patches or survey columns", () => {
    // The structural fix for the whitelist-versus-recipes contradiction: the model cannot emit
    // a patch it is never told about.
    expect(prompt).not.toMatch(/field_patches/);
    expect(prompt).not.toMatch(/Patchable survey fields/);
    expect(prompt).toMatch(/Do not emit prices, durations, trades, difficulty ratings or survey field values/);
  });

  it("lists every work item code", () => {
    for (const item of card.items) {
      expect(prompt, item.workItemCode).toContain(item.workItemCode);
    }
  });

  it("carries no prices, so the model cannot anchor on them", () => {
    for (const item of card.items) {
      for (const rate of [item.rateLowGbp, item.rateExpectedGbp, item.rateHighGbp]) {
        expect(prompt, `${item.workItemCode} ${rate}`).not.toContain(String(rate));
      }
    }
  });

  it("names the current band and the capping rules", () => {
    expect(prompt).toContain(`current band is **${evaluation.band}**`);
    for (const rule of collectTriggeredRules(evaluation).slice(0, 5)) {
      expect(prompt, `rule ${rule.n}`).toContain(`Rule #${rule.n}`);
    }
  });
});

describe("adaptation pool response schema", () => {
  it("has no field_patches property", () => {
    const candidate = ADAPTATION_POOL_RESPONSE_SCHEMA.properties.candidates.items;

    expect(Object.keys(candidate.properties)).not.toContain("field_patches");
  });

  it("declares no property the model must not own", () => {
    const owned = Object.keys(
      ADAPTATION_POOL_RESPONSE_SCHEMA.properties.candidates.items.properties,
    );

    for (const forbidden of [
      "cost_gbp",
      "cost_low",
      "cost_high",
      "duration_days",
      "difficulty",
      "trades",
      "addresses_rules",
    ]) {
      expect(owned, forbidden).not.toContain(forbidden);
    }
  });

  it("keeps its feasibility enum in step with the TypeScript union", () => {
    // Drift here is silent: the schema would let a value through that the parser then folds to
    // "conditional", quietly flagging every line for site verification.
    expect(ADAPTATION_POOL_RESPONSE_SCHEMA.properties.candidates.items.properties.feasibility.enum)
      .toEqual(["feasible", "conditional", "infeasible"]);
  });

  it("requires the fields the parser cannot work without", () => {
    expect(ADAPTATION_POOL_RESPONSE_SCHEMA.properties.candidates.items.required).toEqual(
      expect.arrayContaining(["id", "label", "work_item_code", "quantity"]),
    );
    expect(ADAPTATION_POOL_RESPONSE_SCHEMA.required).toContain("candidates");
  });

  it("orders every object's properties, so responses are stable", () => {
    const walk = (node: Record<string, unknown>): void => {
      if (node.type === "OBJECT") {
        expect(node.propertyOrdering).toEqual(
          Object.keys(node.properties as Record<string, unknown>),
        );
        for (const child of Object.values(node.properties as Record<string, unknown>)) {
          walk(child as Record<string, unknown>);
        }
      }
      if (node.type === "ARRAY") walk(node.items as Record<string, unknown>);
    };

    walk(ADAPTATION_POOL_RESPONSE_SCHEMA as unknown as Record<string, unknown>);
  });
});
