import { describe, expect, it } from "vitest";
import { parseCandidatePool } from "@/lib/adaptation-plans/candidatePool";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";

const rateCard = nationalIndicativeCard();
const triggeredRules = new Set([4, 53, 64, 65, 71, 72, 75, 79]);

function parse(raw: unknown, maxPoolSize?: number) {
  return parseCandidatePool({ raw, rateCard, triggeredRules, maxPoolSize });
}

const wetRoom = {
  id: "wet-room",
  label: "Convert the bathroom to a wet room",
  work_item_code: "wet_room_conversion",
  quantity: 1,
};

describe("parseCandidatePool", () => {
  it("prices a candidate from the rate card", () => {
    const { pool } = parse({ candidates: [wetRoom] });

    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("wet-room");
    expect(pool[0].label).toBe("Convert the bathroom to a wet room");
    expect(pool[0].cost.expectedGbp).toBe(8500);
    expect(pool[0].costBasis.workItemCode).toBe("wet_room_conversion");
  });

  it("never takes field patches from the model", () => {
    // Defence against a prompt regression reintroducing model-authored patches: even when the
    // payload carries them, the card's patches are what reach the classifier.
    const { pool } = parse({
      candidates: [{ ...wetRoom, field_patches: { has_stair_lift: true, nonsense: 1 } }],
    });

    expect(pool[0].fieldPatches).toEqual(
      rateCard.itemsByCode.get("wet_room_conversion")!.fieldPatches,
    );
    expect(pool[0].fieldPatches).not.toHaveProperty("has_stair_lift");
    expect(pool[0].fieldPatches).not.toHaveProperty("nonsense");
  });

  it("routes an unmatched work item to additional works, not the pool", () => {
    const { pool, additionalWorks } = parse({
      candidates: [
        { id: "path", label: "Widen the rear garden path", work_item_code: "path_widening" },
      ],
    });

    expect(pool).toEqual([]);
    expect(additionalWorks).toEqual([
      {
        label: "Widen the rear garden path",
        proposedWorkItem: "path_widening",
        reason: "No rate-card line matches this work — obtain a quote.",
      },
    ]);
  });

  it("routes a candidate with no work item code to additional works", () => {
    const { pool, additionalWorks } = parse({
      candidates: [{ id: "x", label: "Something bespoke", work_item_code: null }],
    });

    expect(pool).toEqual([]);
    expect(additionalWorks[0].proposedWorkItem).toBe("unspecified");
  });

  it("drops an infeasible candidate with its reason", () => {
    const { pool, dropped } = parse({
      candidates: [
        {
          ...wetRoom,
          feasibility: "infeasible",
          infeasible_reason: "The bathroom is 1.8m² — below the footprint a wet room needs.",
        },
      ],
    });

    expect(pool).toEqual([]);
    expect(dropped).toEqual([
      {
        label: "Convert the bathroom to a wet room",
        reason: "The bathroom is 1.8m² — below the footprint a wet room needs.",
      },
    ]);
  });

  it("treats an unknown feasibility as conditional rather than feasible", () => {
    // Fail safe: an unrecognised value must not silently become an unqualified recommendation.
    const { pool } = parse({ candidates: [{ ...wetRoom, feasibility: "probably-fine" }] });

    expect(pool[0].feasibility).toBe("conditional");
    expect(pool[0].confidence.verifyOnSite).toBe(true);
  });

  it("keeps only the first candidate for a given work item", () => {
    const { pool } = parse({
      candidates: [wetRoom, { ...wetRoom, id: "wet-room-again", label: "Same work twice" }],
    });

    expect(pool).toHaveLength(1);
    expect(pool[0].id).toBe("wet-room");
  });

  it("gives every candidate a distinct, stable id", () => {
    const { pool } = parse({
      candidates: [
        { ...wetRoom, id: "  " },
        { id: "", label: "Ramp", work_item_code: "ramp_retrofit_property" },
      ],
    });

    const ids = pool.map((candidate) => candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["wet_room_conversion", "ramp_retrofit_property"]));
  });

  it("only claims rules that are firing", () => {
    const { pool } = parseCandidatePool({
      raw: { candidates: [wetRoom] },
      rateCard,
      triggeredRules: new Set([64]),
    });

    expect(pool[0].addressesRules).toEqual([64]);
  });

  it("trims the pool by rate-card priority, not model order", () => {
    const candidates = rateCard.items.map((item, index) => ({
      id: `c${index}`,
      label: item.description,
      work_item_code: item.workItemCode,
    }));

    const { pool } = parse({ candidates: [...candidates].reverse() }, 3);

    expect(pool).toHaveLength(3);
    expect(pool.map((c) => c.costBasis.workItemCode)).toEqual([
      "threshold_ramp",
      "handrail_install",
      "door_widening_entry",
    ]);
  });

  it("keeps a dependency that survives and drops one that does not", () => {
    const { pool } = parse({
      candidates: [
        { id: "ramp", label: "Ramp", work_item_code: "ramp_retrofit_property" },
        {
          id: "hallway",
          label: "Hallway",
          work_item_code: "hallway_widening",
          depends_on: ["ramp", "never-generated"],
        },
      ],
    });

    expect(pool.find((c) => c.id === "hallway")!.dependsOn).toEqual(["ramp"]);
  });

  it("never lets a candidate depend on itself", () => {
    const { pool } = parse({
      candidates: [{ ...wetRoom, depends_on: ["wet-room"] }],
    });

    expect(pool[0].dependsOn).toEqual([]);
  });

  it("drops a dependency that the pool trim removed", () => {
    const { pool } = parse(
      {
        candidates: [
          { id: "ramp", label: "Ramp", work_item_code: "threshold_ramp" },
          {
            id: "lift",
            label: "Lift",
            work_item_code: "through_floor_lift",
            depends_on: ["ramp"],
          },
        ],
      },
      1,
    );

    expect(pool).toHaveLength(1);
    expect(pool[0].dependsOn).toEqual([]);
  });

  it("carries the narratives through", () => {
    const { overallNarrative, rationaleIfNotBandA } = parse({
      candidates: [],
      overall_narrative: "  The blocking issue is the stepped entrance.  ",
      rationale_if_not_band_a: "The kitchen cannot take a turning circle.",
    });

    expect(overallNarrative).toBe("The blocking issue is the stepped entrance.");
    expect(rationaleIfNotBandA).toBe("The kitchen cannot take a turning circle.");
  });

  it("survives any garbage payload", () => {
    for (const raw of [null, undefined, [], {}, 42, "text", { candidates: null }, { candidates: [null, 1, "x"] }]) {
      const parsed = parse(raw);
      expect(parsed.pool, JSON.stringify(raw)).toEqual([]);
      expect(parsed.additionalWorks, JSON.stringify(raw)).toEqual([]);
    }
  });
});
