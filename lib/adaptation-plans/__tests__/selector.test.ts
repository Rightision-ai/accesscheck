import { describe, expect, it } from "vitest";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import { rankOf } from "@/lib/accessibility/lahr/types";
import { evaluateBundle, selectTier, selectTiers } from "@/lib/adaptation-plans/selector";
import { sumCostRange, DFG_BUDGET_TIERS } from "@/lib/adaptation-plans/types";
import type { AdaptationCandidate } from "@/lib/adaptation-plans/types";
import { BAND_E_PLUS_SURVEY, candidate, lcg, poolFor } from "./fixtures";

const survey = BAND_E_PLUS_SURVEY;
const currentBand = classifyLahr(survey).band;
const pool = poolFor(survey);

function run(overrides: Partial<Parameters<typeof selectTiers>[0]> = {}) {
  return selectTiers({
    survey,
    currentBand,
    pool,
    budgets: DFG_BUDGET_TIERS,
    ...overrides,
  });
}

const ids = (selected: AdaptationCandidate[]) => selected.map((item) => item.id);

describe("selectTiers on a real schedule of rates", () => {
  it("starts from a band that needs work", () => {
    expect(currentBand).toBe("E+");
  });

  it("never exceeds a tier's budget on expected cost", () => {
    const { outcomes } = run();

    outcomes.forEach((outcome, index) => {
      expect(
        sumCostRange(outcome.selected).expectedGbp,
        `tier ${DFG_BUDGET_TIERS[index]}`,
      ).toBeLessThanOrEqual(DFG_BUDGET_TIERS[index]);
    });
  });

  it("makes each tier a superset of the one below", () => {
    const [low, mid, high] = run().outcomes;

    expect(ids(mid.selected)).toEqual(expect.arrayContaining(ids(low.selected)));
    expect(ids(high.selected)).toEqual(expect.arrayContaining(ids(mid.selected)));
  });

  it("never worsens the band as the budget rises", () => {
    const [low, mid, high] = run().outcomes;

    expect(rankOf(low.score.band)).toBeLessThanOrEqual(rankOf(currentBand));
    expect(rankOf(mid.score.band)).toBeLessThanOrEqual(rankOf(low.score.band));
    expect(rankOf(high.score.band)).toBeLessThanOrEqual(rankOf(mid.score.band));
  });

  it("clears more rules as the budget rises", () => {
    const [low, , high] = run().outcomes;

    expect(high.score.rulesCleared).toEqual(
      expect.arrayContaining(low.score.rulesCleared),
    );
    expect(high.score.rulesCleared.length).toBeGreaterThan(low.score.rulesCleared.length);
  });

  it("lifts the band and spends within the cap", () => {
    const [low, , high] = run().outcomes;

    expect(low.score.band).toBe("C");
    expect(low.score.rulesCleared).toEqual([4, 53, 65, 71, 75]);
    expect(high.score.rulesCleared).toEqual([4, 53, 64, 65, 71, 72, 75]);
    expect(high.score.cost.expectedGbp).toBeLessThanOrEqual(30000);
  });

  it("prefers the cheaper of two candidates clearing the same rule", () => {
    // Both ramps clear rule 4. The property ramp is £3,500 and reaches band D; the communal
    // ramp is £5,000 and leaves the band at E+ because rule 6 then fires.
    const { outcomes } = run();

    expect(ids(outcomes[0].selected)).toContain("ramp_retrofit_property");
    expect(ids(outcomes[0].selected)).not.toContain("ramp_retrofit_communal");
  });

  it("buys nothing that clears no rule", () => {
    const { outcomes } = run();
    // Plenty of budget headroom is left in the £30k tier, but a stair lift clears nothing on
    // this property, so it is never bought just to fill the tier.
    for (const dead of ["stair_lift_straight", "stair_lift_curved", "handrail_install"]) {
      expect(ids(outcomes[2].selected), dead).not.toContain(dead);
    }
  });

  it("is deterministic under input order", () => {
    const forward = run();
    const shuffled = selectTiers({
      survey,
      currentBand,
      pool: [...pool].reverse(),
      budgets: DFG_BUDGET_TIERS,
    });

    expect(shuffled.outcomes.map((o) => ids(o.selected))).toEqual(
      forward.outcomes.map((o) => ids(o.selected)),
    );
  });

  it("stays well inside its complexity bound", () => {
    // n^2 * (W+1) per tier, three tiers, with a shared memo across them.
    expect(run().evaluations).toBeLessThanOrEqual(3 * 24 * 24 * 5);
  });
});

describe("selectTier guards", () => {
  const bare = { survey, currentBand, budgetGbp: 30000, seed: [] };

  it("rejects a candidate that would worsen the band", () => {
    // A ramp at 1:4 is worse than no ramp: it satisfies "a ramp exists" and then trips the
    // gradient rules. It must be dropped, not allowed to suppress the whole tier.
    const poison = candidate({
      id: "poison_ramp",
      label: "Property ramp at 1:4",
      cost: { lowGbp: 100, expectedGbp: 100, highGbp: 100 },
      fieldPatches: {
        has_property_ramp: true,
        property_ramp_ah: 25,
        property_ramp_al: 100,
        property_ramp_adequate_platform: false,
      },
    });
    const good = pool.find((c) => c.id === "ramp_retrofit_property")!;

    const outcome = selectTier({ ...bare, pool: [poison, good] });

    expect(ids(outcome.selected)).toEqual(["ramp_retrofit_property"]);
    expect(outcome.dropped.map((d) => d.label)).toContain("Property ramp at 1:4");
    expect(outcome.dropped[0].reason).toMatch(/re-trigger/i);
  });

  it("brings a prerequisite along with its dependant", () => {
    const base = pool.find((c) => c.id === "hallway_widening")!;
    const dependant = {
      ...pool.find((c) => c.id === "wheelchair_storage_create")!,
      dependsOn: ["hallway_widening"],
    };

    const outcome = selectTier({ ...bare, pool: [dependant] , budgetGbp: 30000 });
    expect(ids(outcome.selected)).toEqual([]);

    const withBase = selectTier({ ...bare, pool: [base, dependant] });
    expect(ids(withBase.selected)).toEqual(
      expect.arrayContaining(["hallway_widening", "wheelchair_storage_create"]),
    );
  });

  it("skips a dependency pair that does not fit the budget", () => {
    const base = pool.find((c) => c.id === "hallway_widening")!; // £5,500
    const dependant = {
      ...pool.find((c) => c.id === "wet_room_conversion")!, // £8,500
      dependsOn: ["hallway_widening"],
    };

    const outcome = selectTier({ ...bare, pool: [base, dependant], budgetGbp: 6000 });

    expect(ids(outcome.selected)).toEqual(["hallway_widening"]);
  });

  it("terminates on a dependency cycle and drops both", () => {
    const a = candidate({ id: "a", dependsOn: ["b"], fieldPatches: { has_wheelchair_storage: true } });
    const b = candidate({ id: "b", dependsOn: ["a"], fieldPatches: { has_separate_toilet: true } });

    const outcome = selectTier({ ...bare, pool: [a, b] });

    expect(outcome.selected).toEqual([]);
    expect(outcome.dropped).toHaveLength(2);
  });

  it("drops a candidate whose prerequisite is not in the pool", () => {
    const orphan = {
      ...pool.find((c) => c.id === "wheelchair_storage_create")!,
      dependsOn: ["never_generated"],
    };

    const outcome = selectTier({ ...bare, pool: [orphan] });

    expect(outcome.selected).toEqual([]);
    expect(outcome.dropped[0].reason).toMatch(/depends on/i);
  });

  it("returns an empty selection for an empty pool", () => {
    const outcome = selectTier({ ...bare, pool: [] });

    expect(outcome.selected).toEqual([]);
    expect(outcome.score.band).toBe(currentBand);
    expect(outcome.score.rulesCleared).toEqual([]);
  });

  it("selects nothing when the cheapest useful work is over budget", () => {
    const outcome = selectTier({
      ...bare,
      pool: [pool.find((c) => c.id === "wet_room_conversion")!],
      budgetGbp: 1000,
    });

    expect(outcome.selected).toEqual([]);
  });

  it("keeps the seed even when nothing new fits", () => {
    const seed = [pool.find((c) => c.id === "ramp_retrofit_property")!];

    const outcome = selectTier({
      ...bare,
      pool,
      seed,
      budgetGbp: 4000, // seed costs £3,500; nothing else fits in the remaining £500
    });

    expect(ids(outcome.selected)).toEqual(["ramp_retrofit_property"]);
  });
});

describe("pair look-ahead", () => {
  /**
   * Rule 61 fires when the separate toilet's larger dimension is under 200cm or its smaller one
   * is under 170cm. Widening one dimension alone does not clear it — it just swaps which of the
   * 61/62/63 family applies. Only both together resolve the section, so a strict single-step
   * greedy stalls here and the pair look-ahead is what finds the answer.
   */
  const narrowToilet = {
    has_separate_toilet: true,
    toilet_lateral_space_cm: 100,
    bathroom_toilet_lateral_space: 100,
    toilet_dim_width: 150,
    toilet_dim_depth: 120,
    bathroom_turning_150x150: true,
    bathroom_has_level_access_shower: true,
    num_bed_spaces: 2,
    num_bedrooms: 2,
    entrance_level: "Upper Floor",
    has_internal_stairs: false,
  } as Parameters<typeof selectTier>[0]["survey"];

  const widen = candidate({
    id: "aaa_widen",
    cost: { lowGbp: 500, expectedGbp: 500, highGbp: 500 },
    fieldPatches: { toilet_dim_width: 250 },
  });
  const deepen = candidate({
    id: "bbb_deepen",
    cost: { lowGbp: 500, expectedGbp: 500, highGbp: 500 },
    fieldPatches: { toilet_dim_depth: 170 },
  });

  const band = classifyLahr(narrowToilet).band;
  const args = {
    survey: narrowToilet,
    currentBand: band,
    pool: [widen, deepen],
    budgetGbp: 30000,
    seed: [],
  };

  it("starts capped by rule 61 alone", () => {
    expect(band).toBe("B");
    expect(selectTier({ ...args, pool: [] }).score.rulesCleared).toEqual([]);
  });

  it("finds a pair neither half of which helps alone", () => {
    const paired = selectTier(args);

    expect(ids(paired.selected).sort()).toEqual(["aaa_widen", "bbb_deepen"]);
    expect(paired.score.rulesCleared).toEqual([61]);
    expect(paired.score.band).toBe("A");
  });

  it("finds nothing without look-ahead, proving the test is not vacuous", () => {
    expect(selectTier({ ...args, lookAheadWidth: 0 }).selected).toEqual([]);
  });

  it("refuses the lateral move that clears one rule by triggering another", () => {
    // Deepening alone clears rule 61 and immediately trips rule 62 — gross progress of +1,
    // net progress of zero. Scoring gross would buy it for nothing.
    const deepenOnly = selectTier({ ...args, pool: [deepen], lookAheadWidth: 0 });

    expect(deepenOnly.selected).toEqual([]);

    const score = evaluateBundle(narrowToilet, band, [deepen]);
    expect(score.rulesCleared).toEqual([61]);
    expect(score.rulesIntroduced).toEqual([62]);
    expect(score.netRulesCleared).toBe(0);
  });
});

describe("selectTiers invariants over generated pools", () => {
  it("holds cumulativity, budget and monotonicity across 20 random pools", () => {
    const random = lcg(20260901);

    for (let iteration = 0; iteration < 20; iteration++) {
      const subset = pool.filter(() => random() > 0.35);
      const { outcomes } = selectTiers({
        survey,
        currentBand,
        pool: subset,
        budgets: DFG_BUDGET_TIERS,
      });

      let previous: string[] = [];
      let previousRank = rankOf(currentBand);

      outcomes.forEach((outcome, index) => {
        const selected = ids(outcome.selected);
        expect(selected, `iteration ${iteration} tier ${index}`).toEqual(
          expect.arrayContaining(previous),
        );
        expect(
          sumCostRange(outcome.selected).expectedGbp,
          `iteration ${iteration} tier ${index}`,
        ).toBeLessThanOrEqual(DFG_BUDGET_TIERS[index]);
        expect(rankOf(outcome.score.band), `iteration ${iteration} tier ${index}`).toBeLessThanOrEqual(
          previousRank,
        );
        expect(new Set(selected).size, `iteration ${iteration} duplicates`).toBe(
          selected.length,
        );
        previous = selected;
        previousRank = rankOf(outcome.score.band);
      });
    }
  });
});
