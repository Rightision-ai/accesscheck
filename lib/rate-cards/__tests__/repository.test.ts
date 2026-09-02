import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  loadActiveRateCardRef,
  loadRateCardForOrganisation,
  loadRateCardVersion,
} from "@/lib/rate-cards/repository";
import { ACCESSCHECK_ESTIMATION_CODE } from "@/lib/rate-cards/accesscheckEstimation";

const ORG = "11111111-1111-1111-1111-111111111111";

type Row = Record<string, unknown>;

function card(overrides: Row): Row {
  return {
    id: "card-national",
    organisation_id: null,
    code: ACCESSCHECK_ESTIMATION_CODE,
    label: "AccessCheck estimation",
    version: 1,
    region_multiplier: 1,
    effective_from: "2026-04-01",
    effective_to: null,
    is_active: true,
    created_at: "2026-04-01T00:00:00Z",
    // Present in the table but never selected — see the `source_csv` test below.
    source_csv: "work_item_code,rate_low_gbp\n",
    ...overrides,
  };
}

function item(cardId: string, code: string, overrides: Row = {}): Row {
  return {
    id: `${cardId}:${code}`,
    rate_card_id: cardId,
    work_item_code: code,
    description: code,
    unit: "each",
    rate_low_gbp: 100,
    rate_expected_gbp: 200,
    rate_high_gbp: 300,
    duration_days_low: 1,
    duration_days_expected: 2,
    duration_days_high: 3,
    difficulty: "minor",
    trades: ["joiner"],
    addresses_rule_numbers: [12],
    preconditions: null,
    field_patches: {},
    priority_hint: 10,
    source_label: "AccessCheck estimation — obtain quote",
    is_active: true,
    ...overrides,
  };
}

/**
 * A hand-written stand-in for the Supabase client, matching the house style in
 * `lib/adaptation-plans/__tests__/repository.test.ts` — no mocking library.
 *
 * It records the column list of every select so the tests can assert what is *not* fetched,
 * and applies `.eq` / `.in` / `.or` as real filters rather than ignoring them, because the
 * whole point of these tests is that the wrong row must not win.
 */
function fakeClient(cards: Row[], items: Row[]) {
  const selects: string[] = [];

  const from = (table: string) => {
    const rows = () => (table === "rate_cards" ? cards : items);
    const filters: ((row: Row) => boolean)[] = [];
    let order: { column: string; ascending: boolean } | null = null;
    let limit: number | null = null;

    const result = () => {
      let data = rows().filter((row) => filters.every((filter) => filter(row)));
      if (order) {
        const { column, ascending } = order;
        data = [...data].sort((a, b) => {
          const left = a[column] as number;
          const right = b[column] as number;
          return ascending ? left - right : right - left;
        });
      }
      if (limit !== null) data = data.slice(0, limit);
      return { data, error: null };
    };

    const chain = {
      select: (columns: string) => {
        selects.push(columns);
        return chain;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return chain;
      },
      in: (column: string, values: readonly unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return chain;
      },
      // PostgREST needs `.is` rather than `.eq` for null, and the two are not interchangeable:
      // `.eq(column, null)` matches nothing. `loadRateCardVersion` relies on this.
      is: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return chain;
      },
      // Only the one shape the repository builds:
      // `organisation_id.eq.<uuid>,organisation_id.is.null`
      or: (expression: string) => {
        const wanted = expression.match(/organisation_id\.eq\.([0-9a-f-]+)/)?.[1];
        const allowNull = expression.includes("organisation_id.is.null");
        filters.push(
          (row) =>
            row.organisation_id === wanted ||
            (allowNull && row.organisation_id === null),
        );
        return chain;
      },
      order: (column: string, options: { ascending: boolean }) => {
        order = { column, ascending: options.ascending };
        return chain;
      },
      limit: (count: number) => {
        limit = count;
        return chain;
      },
      maybeSingle: () => {
        const { data } = result();
        return Promise.resolve({ data: data[0] ?? null, error: null });
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve(resolve(result())),
    };
    return chain;
  };

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    selects,
  };
}

describe("loadRateCardForOrganisation", () => {
  it("shadows the national card per work item code rather than replacing it", async () => {
    const { client } = fakeClient(
      [
        card({}),
        card({
          id: "card-org",
          organisation_id: ORG,
          code: "org-schedule-of-rates",
          label: "Wolverhampton SOR",
          version: 2,
        }),
      ],
      [
        item("card-national", "grab_rail_install"),
        item("card-national", "handrail_install"),
        item("card-org", "grab_rail_install", {
          rate_expected_gbp: 275,
          source_label: "Wolverhampton framework",
        }),
      ],
    );

    const result = await loadRateCardForOrganisation(client, ORG);

    expect(result.items).toHaveLength(2);
    // Priced by the organisation.
    expect(result.itemsByCode.get("grab_rail_install")?.rateExpectedGbp).toBe(275);
    expect(result.itemsByCode.get("grab_rail_install")?.sourceLabel).toBe(
      "Wolverhampton framework",
    );
    // Not priced by the organisation, so it keeps its national figure — a partial upload
    // must never lose coverage.
    expect(result.itemsByCode.get("handrail_install")?.rateExpectedGbp).toBe(200);
    expect(result.label).toBe("Wolverhampton SOR");
    expect(result.version).toBe(2);
    expect(result.ownedCardId).toBe("card-org");
  });

  it("gives every line the provenance of the card that actually priced it", async () => {
    const { client } = fakeClient(
      [
        card({}),
        card({
          id: "card-org",
          organisation_id: ORG,
          code: "org-schedule-of-rates",
          version: 2,
          effective_from: "2026-08-01",
        }),
      ],
      [
        item("card-national", "grab_rail_install"),
        item("card-national", "handrail_install"),
        item("card-org", "grab_rail_install"),
      ],
    );

    const result = await loadRateCardForOrganisation(client, ORG);

    // The org-priced line reads as the org card throughout...
    expect(result.itemsByCode.get("grab_rail_install")?.rateCardId).toBe("card-org");
    expect(result.itemsByCode.get("grab_rail_install")?.effectiveFrom).toBe("2026-08-01");
    // ...and the nationally-priced line reads as national throughout, rather than inheriting
    // the org card's id and date while keeping the national label.
    expect(result.itemsByCode.get("handrail_install")?.rateCardId).toBe("card-national");
    expect(result.itemsByCode.get("handrail_install")?.effectiveFrom).toBe("2026-04-01");
  });

  it("uses the highest version when more than one org card is somehow active", async () => {
    // `rate_cards_one_active_per_scope_idx` should make this unreachable. The assertion is
    // that a schema regression degrades to "highest version wins" rather than "whichever row
    // PostgREST returned first", which is what the old bare `find` did.
    const { client } = fakeClient(
      [
        card({}),
        card({ id: "card-v3", organisation_id: ORG, code: "org-schedule-of-rates", version: 3 }),
        card({ id: "card-v9", organisation_id: ORG, code: "org-schedule-of-rates", version: 9 }),
      ],
      [
        item("card-national", "grab_rail_install"),
        item("card-v3", "grab_rail_install", { rate_expected_gbp: 300 }),
        item("card-v9", "grab_rail_install", { rate_expected_gbp: 900 }),
      ],
    );

    const result = await loadRateCardForOrganisation(client, ORG);

    expect(result.version).toBe(9);
    expect(result.itemsByCode.get("grab_rail_install")?.rateExpectedGbp).toBe(900);
  });

  it("never selects source_csv", async () => {
    // The uploaded file is stored on the card. Pulling it out of TOAST on every plan
    // generation and every case page load, for a column nothing here reads, is pure waste.
    const { client, selects } = fakeClient(
      [card({})],
      [item("card-national", "grab_rail_install")],
    );

    await loadRateCardForOrganisation(client, ORG);

    expect(selects.length).toBeGreaterThan(0);
    for (const columns of selects) {
      expect(columns).not.toContain("*");
      expect(columns).not.toContain("source_csv");
    }
  });

  it("drops patch columns the classifier does not read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = fakeClient(
      [card({})],
      [
        item("card-national", "grab_rail_install", {
          // `door_width_bathroom` is a real patchable column; the other two are columns a
          // malicious row would love to write — one finalises the case, one fakes the lock.
          field_patches: { door_width_bathroom: 900, is_locked: true, status: "complete" },
        }),
      ],
    );

    const result = await loadRateCardForOrganisation(client, ORG);
    const patches = result.itemsByCode.get("grab_rail_install")!.fieldPatches;

    expect(patches).toEqual({ door_width_bathroom: 900 });
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("falls back to the built-in national card when the table has no rows", async () => {
    // A fresh environment that has not run the seed migration still prices plans.
    const { client } = fakeClient([], []);
    const result = await loadRateCardForOrganisation(client, ORG);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.ownedCardId).toBeNull();
  });

  it("falls back when a card exists but has no active items", async () => {
    const { client } = fakeClient(
      [card({})],
      [item("card-national", "grab_rail_install", { is_active: false })],
    );
    const result = await loadRateCardForOrganisation(client, ORG);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("ignores another organisation's card", async () => {
    const { client } = fakeClient(
      [
        card({}),
        card({
          id: "card-other",
          organisation_id: "22222222-2222-2222-2222-222222222222",
          code: "org-schedule-of-rates",
          version: 4,
        }),
      ],
      [
        item("card-national", "grab_rail_install"),
        item("card-other", "grab_rail_install", { rate_expected_gbp: 999 }),
      ],
    );

    const result = await loadRateCardForOrganisation(client, ORG);

    expect(result.ownedCardId).toBeNull();
    expect(result.itemsByCode.get("grab_rail_install")?.rateExpectedGbp).toBe(200);
  });
});

describe("loadActiveRateCardRef", () => {
  it("returns null when the organisation runs on national rates alone", async () => {
    const { client } = fakeClient([card({})], []);
    expect(await loadActiveRateCardRef(client, ORG)).toBeNull();
  });

  it("returns the active org card, which is what plan staleness compares against", async () => {
    const { client } = fakeClient(
      [
        card({}),
        card({
          id: "card-v1",
          organisation_id: ORG,
          code: "org-schedule-of-rates",
          version: 1,
          is_active: false,
        }),
        card({
          id: "card-v2",
          organisation_id: ORG,
          code: "org-schedule-of-rates",
          version: 2,
          label: "Wolverhampton SOR v2",
        }),
      ],
      [],
    );

    const ref = await loadActiveRateCardRef(client, ORG);

    expect(ref).toEqual({
      id: "card-v2",
      code: "org-schedule-of-rates",
      version: 2,
      label: "Wolverhampton SOR v2",
      effectiveFrom: "2026-04-01",
    });
  });
});

describe("loadRateCardVersion", () => {
  /** An estimation card plus a superseded org version that priced one of the two items. */
  const scenario = () =>
    fakeClient(
      [
        card({}),
        card({
          id: "card-v1",
          organisation_id: ORG,
          code: "org-schedule-of-rates",
          version: 1,
          label: "Wolverhampton SOR v1",
          effective_from: "2026-05-01",
          effective_to: "2026-06-30",
          is_active: false,
        }),
      ],
      [
        item("card-national", "handrail_install"),
        item("card-national", "wet_room_conversion"),
        item("card-v1", "wet_room_conversion", {
          rate_expected_gbp: 9100,
          source_label: "Wolverhampton SOR v1",
        }),
      ],
    );

  it("merges a superseded version over the estimation rather than showing it alone", async () => {
    // The version only ever stored the lines that upload priced; every other line was inherited
    // at generation time, so showing the version's rows alone would under-report the plan.
    const { client } = scenario();

    const result = await loadRateCardVersion(client, "card-v1");

    expect(result?.items).toHaveLength(2);
    expect(result?.itemsByCode.get("wet_room_conversion")?.rateExpectedGbp).toBe(9100);
    expect(result?.itemsByCode.get("handrail_install")?.rateExpectedGbp).toBe(200);
  });

  it("reads a retired version — the whole point is showing rates no longer in force", async () => {
    // `is_active` is deliberately not filtered. A plan priced by v1 must still explain itself
    // after v2 supersedes it, which is exactly when the settings page gives the wrong answer.
    const { client } = scenario();

    const result = await loadRateCardVersion(client, "card-v1");

    expect(result?.label).toBe("Wolverhampton SOR v1");
    expect(result?.version).toBe(1);
    expect(result?.effectiveFrom).toBe("2026-05-01");
  });

  it("marks which lines are the authority's own and which were inherited", async () => {
    const { client } = scenario();

    const result = await loadRateCardVersion(client, "card-v1");

    expect(result?.ownedCardId).toBe("card-v1");
    expect(result?.itemsByCode.get("wet_room_conversion")?.rateCardId).toBe("card-v1");
    expect(result?.itemsByCode.get("handrail_install")?.rateCardId).toBe("card-national");
  });

  it("returns the estimation alone for a plan that was never priced by an org card", async () => {
    const { client } = scenario();

    const result = await loadRateCardVersion(client, null);

    expect(result?.ownedCardId).toBeNull();
    expect(result?.version).toBeNull();
    expect(result?.itemsByCode.get("wet_room_conversion")?.rateExpectedGbp).toBe(200);
  });

  it("returns null for an id the caller cannot read", async () => {
    // RLS filters another tenant's card out of the select, so it arrives here as no row —
    // which must be a 404, not an empty card that reads as "this plan had no rates".
    const { client } = scenario();

    expect(await loadRateCardVersion(client, "card-someone-else")).toBeNull();
  });
});
