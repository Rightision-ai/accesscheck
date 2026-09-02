import { describe, expect, it } from "vitest";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import { buildAdaptationPlanSet } from "@/lib/adaptation-plans/buildPlan";
import { DFG_BUDGET_TIERS } from "@/lib/adaptation-plans/types";
import { accesscheckEstimationCard } from "@/lib/rate-cards/accesscheckEstimation";
import { BAND_E_PLUS_SURVEY, poolFor } from "./fixtures";
import golden from "./plan.golden.json";

const survey = BAND_E_PLUS_SURVEY;
const currentBand = classifyLahr(survey).band;
const rateCard = accesscheckEstimationCard();

function build(overrides: Partial<Parameters<typeof buildAdaptationPlanSet>[0]> = {}) {
  return buildAdaptationPlanSet({
    survey,
    currentBand,
    pool: poolFor(survey),
    budgets: DFG_BUDGET_TIERS,
    rateCard,
    engineModel: "gemini-3.7-flash",
    additionalWorks: [],
    poolDropped: [],
    generatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("buildAdaptationPlanSet", () => {
  it("marks carried-forward lines as inherited", () => {
    const [low, mid, high] = build().tiers;

    expect(low.lines.every((line) => !line.isInherited)).toBe(true);
    expect(mid.lines.every((line) => line.isInherited)).toBe(true);
    expect(high.lines.filter((line) => !line.isInherited)).toHaveLength(1);
  });

  it("explains a tier that adds nothing, rather than rendering it empty", () => {
    // The old pipeline emitted an empty higher tier while claiming the previous tier's band —
    // the inherited work simply vanished from the UI.
    const [low, mid] = build().tiers;

    expect(mid.lines).toHaveLength(low.lines.length);
    expect(mid.unavailableReason).toMatch(/against £6,400 of headroom/);
    expect(mid.unavailableReason).toContain("wet room");
  });

  it("leaves no unavailableReason on a tier that did add work", () => {
    const [low, , high] = build().tiers;

    expect(low.unavailableReason).toBeUndefined();
    expect(high.unavailableReason).toBeUndefined();
  });

  it("reports which rules are still capping the band", () => {
    const [low, , high] = build().tiers;

    expect(low.rulesRemaining).toEqual([64, 72, 79]);
    // The £30k tier buys the wet room, leaving only the kitchen turning circle.
    expect(high.rulesRemaining).toEqual([79]);
    expect(high.rulesCleared).not.toContain(79);
  });

  it("gives every line a reason a surveyor can read", () => {
    const [low, , high] = build().tiers;

    expect(low.lines[0].selectionReason).toMatch(
      /^Included because it clears Accessible Housing Rules rule 4 for £[\d,]+–£[\d,]+/,
    );
    expect(high.lines[0].selectionReason).toBe("Carried forward from the £20,000 plan.");
  });

  it("totals costs as ranges, and says so when the top of the range exceeds the cap", () => {
    const [, , high] = build().tiers;

    expect(high.totalCost.expectedGbp).toBeLessThanOrEqual(30000);
    // Packing is against expected cost, so the upper bound can exceed the tier — the UI has to
    // show the range rather than imply the plan is guaranteed to land under the cap.
    expect(high.totalCost.highGbp).toBeGreaterThan(30000);
    expect(high.totalCost.lowGbp).toBeLessThan(high.totalCost.expectedGbp);
  });

  it("records the schedule of rates that priced the plan", () => {
    const set = build();

    expect(set.rateCardLabel).toBe("AccessCheck estimation — obtain quote");
    expect(set.rateCardEffectiveFrom).toBe("2026-04-01");
    expect(set.engineModel).toBe("gemini-3.7-flash");
  });

  it("prefers the model's narrative and falls back to a generated one", () => {
    expect(build({ overallNarrative: "Model prose." }).overallNarrative).toBe("Model prose.");
    expect(build().overallNarrative).toContain("currently band E+");
  });

  it("drops the band-A rationale once band A is reached", () => {
    const set = build({ rationaleIfNotBandA: "The kitchen cannot take a turning circle." });

    expect(set.reachesBandAAt30k).toBe(false);
    expect(set.rationaleIfNotBandA).toBe("The kitchen cannot take a turning circle.");
  });

  it("produces three empty, explained tiers for an empty pool", () => {
    const set = build({ pool: [] });

    expect(set.tiers).toHaveLength(3);
    for (const tier of set.tiers) {
      expect(tier.lines).toEqual([]);
      expect(tier.totalCost).toEqual({ lowGbp: 0, expectedGbp: 0, highGbp: 0 });
      expect(tier.potentialBand).toBe(currentBand);
      expect(tier.unavailableReason).toBe(
        "No feasible adaptation was identified for this property from the visible evidence.",
      );
    }
    expect(set.overallNarrative).toContain("No adaptation within the Disabled Facilities Grant cap");
  });

  it("matches the reviewed golden plan", () => {
    // Hand-checked output for the band E+ fixture. Any change to the objective, the tie-breaks
    // or the schedule of rates shows up here as a reviewable diff rather than passing silently.
    expect(
      build({
        overallNarrative:
          "The stepped entrance is the blocking risk for a wheelchair user; the plan clears access first, then the bathroom.",
      }),
    ).toEqual(golden);
  });
});
