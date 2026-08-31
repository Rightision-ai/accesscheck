import { describe, expect, it } from "vitest";
import { parseRateCardCsv, resolveAgainstNational } from "@/lib/rate-cards/csv";
import { buildRateCardDiff } from "@/lib/rate-cards/diff";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";
import { indexByCode, type RateCard, type RateCardItem } from "@/lib/rate-cards/types";

const national = nationalIndicativeCard();
const ORG_CARD_ID = "org-card-1";

/** An effective card where the listed codes are priced by the organisation. */
function effectiveWith(overrides: Record<string, number>): RateCard {
  const items: RateCardItem[] = national.items.map((item) =>
    overrides[item.workItemCode] === undefined
      ? item
      : {
          ...item,
          rateExpectedGbp: overrides[item.workItemCode],
          rateLowGbp: Math.round(overrides[item.workItemCode] * 0.8),
          rateHighGbp: Math.round(overrides[item.workItemCode] * 1.5),
          sourceLabel: "Council SOR",
          rateCardId: ORG_CARD_ID,
          effectiveFrom: "2026-05-01",
        },
  );
  return {
    ...national,
    id: ORG_CARD_ID,
    organisationId: "org-1",
    ownedCardId: ORG_CARD_ID,
    version: 1,
    label: "Council SOR",
    items,
    itemsByCode: indexByCode(items),
  };
}

function prepare(...rows: string[]) {
  const header = "work_item_code,rate_low_gbp,rate_expected_gbp,rate_high_gbp";
  const parsed = parseRateCardCsv([header, ...rows].join("\n"));
  expect(parsed.errors).toEqual([]);
  const { prepared, errors } = resolveAgainstNational(parsed.rows, national.itemsByCode);
  expect(errors).toEqual([]);
  return prepared;
}

const entryFor = (diff: ReturnType<typeof buildRateCardDiff>, code: string) =>
  diff.entries.find((entry) => entry.workItemCode === code);

describe("buildRateCardDiff", () => {
  it("marks a code the organisation is pricing for the first time as added", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,300,520,900"),
      effective: national,
      national,
    });

    expect(entryFor(diff, "threshold_ramp")).toMatchObject({
      status: "added",
      currentSource: "national",
      currentExpectedGbp: 450,
      nextExpectedGbp: 520,
      deltaGbp: 70,
    });
  });

  it("marks a reprice of the organisation's own rate as changed", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,330,560,1100"),
      effective: effectiveWith({ threshold_ramp: 520 }),
      national,
    });

    expect(entryFor(diff, "threshold_ramp")).toMatchObject({
      status: "changed",
      currentSource: "organisation",
      currentExpectedGbp: 520,
      nextExpectedGbp: 560,
      deltaGbp: 40,
      deltaPct: 7.7,
    });
  });

  it("marks an identical reprice as unchanged", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,416,520,780"),
      effective: effectiveWith({ threshold_ramp: 520 }),
      national,
    });

    expect(entryFor(diff, "threshold_ramp")?.status).toBe("unchanged");
  });

  it("marks an omitted org-priced code as removed, showing the national rate it reverts to", () => {
    // The foot-gun the preview exists to defuse: a version is exactly the uploaded file, so a
    // code the council prices today but leaves out does not carry forward.
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,300,520,900"),
      effective: effectiveWith({ threshold_ramp: 520, handrail_install: 900 }),
      national,
    });

    expect(entryFor(diff, "handrail_install")).toMatchObject({
      status: "removed",
      currentExpectedGbp: 900,
      nextExpectedGbp: 350, // the national figure, not a blank
      deltaGbp: -550,
    });
  });

  it("lists national codes the upload does not price rather than calling them removed", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,300,520,900"),
      effective: national,
      national,
    });

    expect(diff.summary).toMatchObject({ added: 1, changed: 0, removed: 0 });
    expect(diff.summary.inherited).toBe(national.items.length - 1);
    expect(diff.inheritedFromNational).toContain("wet_room_conversion");
    expect(diff.inheritedFromNational).not.toContain("threshold_ramp");
  });

  it("flags a duration-only change", () => {
    const parsed = parseRateCardCsv(
      "work_item_code,rate_low_gbp,rate_expected_gbp,rate_high_gbp,duration_days_low,duration_days_expected,duration_days_high\nthreshold_ramp,416,520,780,2,3,4",
    );
    expect(parsed.errors).toEqual([]);
    const { prepared, errors } = resolveAgainstNational(parsed.rows, national.itemsByCode);
    expect(errors).toEqual([]);

    const diff = buildRateCardDiff({
      prepared,
      effective: effectiveWith({ threshold_ramp: 520 }),
      national,
    });

    expect(entryFor(diff, "threshold_ramp")).toMatchObject({
      status: "changed",
      deltaGbp: 0,
      durationChanged: true,
    });
  });

  it("sorts the loudest consequences first", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,330,560,1100", "wet_room_conversion,6000,9200,15000"),
      effective: effectiveWith({ threshold_ramp: 520, handrail_install: 900 }),
      national,
    });

    // Removed first — a price silently reverting is the thing most likely to surprise —
    // then changed, then added. Everything else is inherited and not an entry at all.
    expect(diff.entries.map((entry) => entry.status)).toEqual(["removed", "changed", "added"]);
  });

  it("returns a null percentage rather than dividing by zero", () => {
    const diff = buildRateCardDiff({
      prepared: prepare("threshold_ramp,0,0,0"),
      effective: effectiveWith({ threshold_ramp: 0 }),
      national,
    });

    expect(entryFor(diff, "threshold_ramp")?.deltaPct).toBeNull();
  });
});
