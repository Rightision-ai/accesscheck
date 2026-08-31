import { describe, expect, it } from "vitest";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";
import {
  clampQuantity,
  formatCostRange,
  priceCandidate,
  priceItem,
  scaleDuration,
} from "@/lib/rate-cards/pricing";
import type { RateCard, RateCardItem } from "@/lib/rate-cards/types";

const card = nationalIndicativeCard();
const wetRoom = card.itemsByCode.get("wet_room_conversion") as RateCardItem;
const thresholdRamp = card.itemsByCode.get("threshold_ramp") as RateCardItem;

function withMultiplier(multiplier: number): RateCard {
  return { ...card, regionMultiplier: multiplier };
}

describe("priceItem", () => {
  it("reproduces the card range at quantity 1 and multiplier 1", () => {
    expect(priceItem(wetRoom, 1, 1)).toEqual({
      lowGbp: wetRoom.rateLowGbp,
      expectedGbp: wetRoom.rateExpectedGbp,
      highGbp: wetRoom.rateHighGbp,
    });
  });

  it("scales every bound by quantity", () => {
    expect(priceItem(thresholdRamp, 3, 1)).toEqual({
      lowGbp: 750,
      expectedGbp: 1350,
      highGbp: 2700,
    });
  });

  it("applies the region multiplier to every bound", () => {
    expect(priceItem(thresholdRamp, 1, 1.15)).toEqual({
      lowGbp: 288,
      expectedGbp: 518,
      highGbp: 1035,
    });
  });

  it("keeps low <= expected <= high after rounding", () => {
    for (const item of card.items) {
      for (const quantity of [1, 2, 7]) {
        const cost = priceItem(item, quantity, 1.137);
        expect(cost.lowGbp, item.workItemCode).toBeLessThanOrEqual(cost.expectedGbp);
        expect(cost.expectedGbp, item.workItemCode).toBeLessThanOrEqual(cost.highGbp);
      }
    }
  });
});

describe("clampQuantity", () => {
  it("defaults anything unusable to one unit", () => {
    for (const value of [undefined, null, "", "abc", Number.NaN, 0, -3]) {
      expect(clampQuantity(value, "each"), String(value)).toBe(1);
    }
  });

  it("rounds and caps by unit", () => {
    expect(clampQuantity(2.6, "each")).toBe(3);
    expect(clampQuantity(500, "each")).toBe(20);
    expect(clampQuantity(500, "m2")).toBe(200);
  });
});

describe("scaleDuration", () => {
  it("does not charge a full extra day per additional unit", () => {
    expect(scaleDuration(4, 1)).toBe(4);
    expect(scaleDuration(4, 2)).toBe(6);
    expect(scaleDuration(4, 3)).toBe(8);
  });

  it("never returns less than a day", () => {
    expect(scaleDuration(0, 1)).toBe(1);
  });
});

describe("priceCandidate", () => {
  const triggered = new Set([64, 71, 72]);

  it("takes cost, patches, trades and difficulty from the card, not the model", () => {
    const candidate = priceCandidate({
      id: "wet-room",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: {
        label: "Convert the first-floor bathroom to a wet room",
        quantity: 1,
        // Everything below is the model overreaching; all of it must be ignored.
        ...({
          cost_gbp: 999,
          difficulty: "minor",
          trades: ["nonsense"],
          field_patches: { has_stair_lift: true },
        } as Record<string, unknown>),
      },
    });

    expect(candidate.cost.expectedGbp).toBe(wetRoom.rateExpectedGbp);
    expect(candidate.difficulty).toBe(wetRoom.difficulty);
    expect(candidate.trades).toEqual(wetRoom.trades);
    expect(candidate.fieldPatches).toEqual(wetRoom.fieldPatches);
    expect(candidate.fieldPatches).not.toHaveProperty("has_stair_lift");
  });

  it("keeps the model's label and narrative", () => {
    const candidate = priceCandidate({
      id: "wet-room",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: {
        label: "Convert the first-floor bathroom to a wet room",
        narrative: "The bath is unusable for a tenant who cannot step over the rim.",
      },
    });

    expect(candidate.label).toBe("Convert the first-floor bathroom to a wet room");
    expect(candidate.narrative).toContain("cannot step over the rim");
  });

  it("falls back to the card description when the model gives no label", () => {
    const candidate = priceCandidate({
      id: "wet-room",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: { label: "   " },
    });

    expect(candidate.label).toBe(wetRoom.description);
  });

  it("only claims rules that are actually firing", () => {
    const candidate = priceCandidate({
      id: "wet-room",
      item: wetRoom,
      card,
      // Rule 64 is capping; 71 and 72 are not.
      triggeredRules: new Set([64]),
      raw: {},
    });

    expect(wetRoom.addressesRuleNumbers).toEqual(expect.arrayContaining([64, 71, 72]));
    expect(candidate.addressesRules).toEqual([64]);
  });

  it("records the card's provenance on every line", () => {
    const candidate = priceCandidate({
      id: "ramp",
      item: thresholdRamp,
      card: withMultiplier(1.15),
      triggeredRules: new Set([7]),
      raw: { quantity: 2 },
    });

    expect(candidate.costBasis).toEqual({
      workItemCode: "threshold_ramp",
      quantity: 2,
      unit: "each",
      rateCardId: null,
      rateCardLabel: "National indicative — obtain quote",
      regionMultiplier: 1.15,
      effectiveFrom: "2026-04-01",
    });
  });

  it("discounts confidence for a line needing site verification", () => {
    const plain = priceCandidate({
      id: "a",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: { visual_evidence_confidence: 0.8 },
    });
    const verify = priceCandidate({
      id: "b",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: { visual_evidence_confidence: 0.8, verify_on_site: true },
    });

    expect(plain.confidence.score).toBeCloseTo(0.8, 5);
    expect(plain.confidence.verifyOnSite).toBe(false);
    expect(verify.confidence.score).toBeCloseTo(0.65, 5);
    expect(verify.confidence.verifyOnSite).toBe(true);
  });

  it("treats a conditional candidate as needing verification", () => {
    const candidate = priceCandidate({
      id: "a",
      item: wetRoom,
      card,
      triggeredRules: triggered,
      raw: { feasibility: "conditional" },
    });

    expect(candidate.feasibility).toBe("conditional");
    expect(candidate.confidence.verifyOnSite).toBe(true);
  });

  it("keeps confidence inside its bounds for any input", () => {
    for (const value of [undefined, null, "x", -5, 0, 0.5, 1, 99]) {
      for (const verify of [false, true]) {
        const { score } = priceCandidate({
          id: "a",
          item: wetRoom,
          card,
          triggeredRules: triggered,
          raw: { visual_evidence_confidence: value, verify_on_site: verify },
        }).confidence;
        expect(score, `${value}/${verify}`).toBeGreaterThanOrEqual(0.05);
        expect(score, `${value}/${verify}`).toBeLessThanOrEqual(0.95);
      }
    }
  });
});

describe("formatCostRange", () => {
  it("renders a range with thousands separators", () => {
    expect(formatCostRange({ lowGbp: 3800, expectedGbp: 4600, highGbp: 5400 })).toBe(
      "£3,800–£5,400",
    );
  });

  it("collapses to a single figure when there is no spread", () => {
    expect(formatCostRange({ lowGbp: 4600, expectedGbp: 4600, highGbp: 4600 })).toBe("£4,600");
  });
});
