import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  clearAdaptationPlanSet,
  loadAdaptationPlanSet,
  persistAdaptationPlanSet,
} from "@/lib/adaptation-plans/repository";
import type { AdaptationPlanSet } from "@/lib/adaptation-plans/types";
import golden from "./plan.golden.json";

const planSet = golden as unknown as AdaptationPlanSet;

/**
 * A hand-written stand-in for the Supabase client — no mocking library, matching the house
 * style. It records every select so the N+1 guard can count them, and models
 * `replace_adaptation_plan` the way the SQL function behaves: delete the survey's plans, then
 * insert the payload.
 */
function fakeClient() {
  const plans: Record<string, unknown>[] = [];
  const lines: Record<string, unknown>[] = [];
  const selects: string[] = [];

  const query = (table: string) => {
    const filters: { column: string; values: unknown[] }[] = [];
    let mode: "select" | "delete" = "select";

    const rows = () => (table === "adaptation_plans" ? plans : lines);
    const result = () => ({
      data: rows().filter((row) =>
        filters.every((filter) => filter.values.includes(row[filter.column])),
      ),
      error: null,
    });

    const chain = {
      select: () => {
        mode = "select";
        selects.push(table);
        return chain;
      },
      delete: () => {
        mode = "delete";
        return chain;
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, values: [value] });
        return chain;
      },
      in: (column: string, values: readonly unknown[]) => {
        filters.push({ column, values: [...values] });
        return chain;
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (mode === "delete") {
          const doomed = result().data as Record<string, unknown>[];
          const doomedIds = new Set(doomed.map((row) => row.id));
          for (const list of [plans, lines]) {
            for (let i = list.length - 1; i >= 0; i--) {
              if (doomed.includes(list[i]) || doomedIds.has(list[i].plan_id)) {
                list.splice(i, 1);
              }
            }
          }
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        return Promise.resolve(resolve(result()));
      },
    };
    return chain;
  };

  const client = {
    from: (table: string) => query(table),
    rpc: (_name: string, params: Record<string, unknown>) => {
      const surveyId = params.target_survey_id as number;
      const organisationId = params.target_organisation_id as string;
      const payload = params.payload as AdaptationPlanSet;

      for (let i = plans.length - 1; i >= 0; i--) {
        if (plans[i].survey_id === surveyId) {
          const planId = plans[i].id;
          for (let j = lines.length - 1; j >= 0; j--) {
            if (lines[j].plan_id === planId) lines.splice(j, 1);
          }
          plans.splice(i, 1);
        }
      }

      payload.tiers.forEach((tier, tierIndex) => {
        const id = `plan-${tierIndex}`;
        plans.push({
          id,
          survey_id: surveyId,
          organisation_id: organisationId,
          budget_gbp: tier.budgetGbp,
          total_cost_low_gbp: tier.totalCost.lowGbp,
          total_cost_expected_gbp: tier.totalCost.expectedGbp,
          total_cost_high_gbp: tier.totalCost.highGbp,
          total_duration_days: tier.totalDurationDays,
          overall_difficulty: tier.overallDifficulty,
          potential_band: tier.potentialBand,
          current_band: payload.currentBand,
          rules_cleared: tier.rulesCleared,
          rules_remaining: tier.rulesRemaining,
          unavailable_reason: tier.unavailableReason ?? null,
          overall_narrative: payload.overallNarrative,
          reaches_band_a_at_30k: payload.reachesBandAAt30k,
          rationale_if_not_band_a: payload.rationaleIfNotBandA ?? null,
          additional_works: payload.additionalWorks,
          dropped_candidates: tier.droppedCandidates,
          engine_model: payload.engineModel,
          budget_cap_gbp: payload.budgetCapGbp,
          rate_card_id: payload.rateCardId,
          rate_card_label: payload.rateCardLabel,
          rate_card_effective_from: payload.rateCardEffectiveFrom,
          generated_at: payload.generatedAt,
        });
        tier.lines.forEach((line, position) => {
          lines.push({
            plan_id: id,
            position,
            candidate_id: line.id,
            label: line.label,
            addresses_rules: line.addressesRules,
            cost_low_gbp: line.cost.lowGbp,
            cost_expected_gbp: line.cost.expectedGbp,
            cost_high_gbp: line.cost.highGbp,
            cost_basis: line.costBasis,
            duration_days: line.durationDays,
            difficulty: line.difficulty,
            trades: line.trades,
            narrative: line.narrative ?? null,
            preconditions: line.preconditions ?? null,
            // numeric(3,2) comes back as a string from PostgREST.
            confidence: String(line.confidence.score),
            confidence_basis: line.confidence.basis,
            verify_on_site: line.confidence.verifyOnSite,
            verify_note: line.confidence.verifyNote ?? null,
            feasibility: line.feasibility,
            depends_on: line.dependsOn,
            field_patches: line.fieldPatches,
            is_inherited: line.isInherited,
            selection_reason: line.selectionReason,
            source: line.source,
          });
        });
      });
      return Promise.resolve({ error: null });
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, plans, lines, selects };
}

describe("adaptation plan repository", () => {
  it("round-trips a plan set unchanged", async () => {
    const { client } = fakeClient();

    await persistAdaptationPlanSet(client, 1, "org-1", planSet);

    expect(await loadAdaptationPlanSet(client, 1)).toEqual(planSet);
  });

  it("preserves inherited flags and line order", async () => {
    const { client } = fakeClient();
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);

    const loaded = (await loadAdaptationPlanSet(client, 1))!;
    const [low, mid, high] = loaded.tiers;

    // The bug this column exists to fix: "Carried over" never survived a reload.
    expect(mid.lines.every((line) => line.isInherited)).toBe(true);
    expect(high.lines.filter((line) => !line.isInherited)).toHaveLength(1);
    expect(low.lines.map((line) => line.id)).toEqual(
      planSet.tiers[0].lines.map((line) => line.id),
    );
  });

  it("keeps all three cost bounds and the cost basis", async () => {
    const { client } = fakeClient();
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);

    const loaded = (await loadAdaptationPlanSet(client, 1))!;

    expect(loaded.tiers[2].totalCost).toEqual(planSet.tiers[2].totalCost);
    expect(loaded.tiers[0].lines[0].costBasis).toEqual(planSet.tiers[0].lines[0].costBasis);
    expect(loaded.tiers[0].lines[0].confidence).toEqual(
      planSet.tiers[0].lines[0].confidence,
    );
  });

  it("orders tiers by budget regardless of storage order", async () => {
    const { client, plans } = fakeClient();
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);
    plans.reverse();

    const loaded = (await loadAdaptationPlanSet(client, 1))!;

    expect(loaded.tiers.map((tier) => tier.budgetGbp)).toEqual([15000, 20000, 30000]);
  });

  it("loads lines for every tier in a single query", async () => {
    const { client, selects } = fakeClient();
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);
    selects.length = 0;

    await loadAdaptationPlanSet(client, 1);

    // One select for plans, one for all their lines — not one per tier.
    expect(selects).toEqual(["adaptation_plans", "adaptation_plan_lines"]);
  });

  it("replaces rather than appends on a second write", async () => {
    const { client, plans, lines } = fakeClient();

    await persistAdaptationPlanSet(client, 1, "org-1", planSet);
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);

    expect(plans).toHaveLength(3);
    expect(lines).toHaveLength(planSet.tiers.reduce((n, tier) => n + tier.lines.length, 0));
  });

  it("returns null when nothing is stored", async () => {
    const { client } = fakeClient();

    expect(await loadAdaptationPlanSet(client, 999)).toBeNull();
  });

  it("clears a survey's plans", async () => {
    const { client, plans, lines } = fakeClient();
    await persistAdaptationPlanSet(client, 1, "org-1", planSet);

    await clearAdaptationPlanSet(client, 1);

    expect(plans).toHaveLength(0);
    expect(lines).toHaveLength(0);
    expect(await loadAdaptationPlanSet(client, 1)).toBeNull();
  });

  it("surfaces a write failure instead of silently losing the plan", async () => {
    const failing = {
      rpc: () => Promise.resolve({ error: { message: "permission denied" } }),
    } as unknown as SupabaseClient<Database>;

    await expect(persistAdaptationPlanSet(failing, 1, "org-1", planSet)).rejects.toThrow(
      /permission denied/,
    );
  });
});
