import type { PreparedRateCardRow } from "./csv";
import type { RateCard } from "./types";

export type RateCardDiffStatus = "added" | "changed" | "unchanged" | "removed";

export type RateCardDiffEntry = {
  workItemCode: string;
  description: string;
  status: RateCardDiffStatus;
  /** Where the price in use today comes from. */
  currentSource: "national" | "organisation";
  currentExpectedGbp: number;
  nextExpectedGbp: number;
  deltaGbp: number;
  /** Null when the current price is 0, where a percentage means nothing. */
  deltaPct: number | null;
  durationChanged: boolean;
};

export type RateCardDiff = {
  entries: RateCardDiffEntry[];
  /** National codes this upload does not price — they keep their national rates. */
  inheritedFromNational: string[];
  summary: {
    added: number;
    changed: number;
    unchanged: number;
    removed: number;
    inherited: number;
  };
};

const STATUS_ORDER: Record<RateCardDiffStatus, number> = {
  removed: 0,
  changed: 1,
  added: 2,
  unchanged: 3,
};

/**
 * What publishing this file would actually do, expressed against the card in use today.
 *
 * The `removed` group is the one that needs the loudest copy in the UI. A version is exactly
 * the file uploaded: a code the organisation prices today but omits from this file is not
 * carried forward — it reverts to the national rate. That is the only rule predictable from
 * looking at the spreadsheet, but it is a foot-gun unless the preview says so, so those entries
 * carry the national figure as `nextExpectedGbp` rather than a blank.
 */
export function buildRateCardDiff(args: {
  prepared: PreparedRateCardRow[];
  /** The merged card pricing plans right now. */
  effective: RateCard;
  /** National rates, the floor every organisation keeps. */
  national: RateCard;
}): RateCardDiff {
  const { prepared, effective, national } = args;
  const uploadedByCode = new Map(prepared.map((row) => [row.workItemCode, row]));
  const entries: RateCardDiffEntry[] = [];
  const inheritedFromNational: string[] = [];

  for (const [code, currentItem] of effective.itemsByCode) {
    const nationalItem = national.itemsByCode.get(code);
    const uploaded = uploadedByCode.get(code);
    const currentSource: RateCardDiffEntry["currentSource"] =
      effective.ownedCardId !== null && currentItem.rateCardId === effective.ownedCardId
        ? "organisation"
        : "national";

    if (!uploaded) {
      if (currentSource === "organisation") {
        // Priced by the organisation today, absent from this file: it reverts to national.
        const nationalExpected = nationalItem?.rateExpectedGbp ?? currentItem.rateExpectedGbp;
        entries.push({
          workItemCode: code,
          description: currentItem.description,
          status: "removed",
          currentSource,
          currentExpectedGbp: currentItem.rateExpectedGbp,
          nextExpectedGbp: nationalExpected,
          deltaGbp: nationalExpected - currentItem.rateExpectedGbp,
          deltaPct: percentChange(currentItem.rateExpectedGbp, nationalExpected),
          durationChanged: false,
        });
      } else {
        inheritedFromNational.push(code);
      }
      continue;
    }

    const priceChanged = uploaded.rateExpectedGbp !== currentItem.rateExpectedGbp;
    const durationChanged =
      uploaded.durationDaysLow !== currentItem.durationDaysLow ||
      uploaded.durationDaysExpected !== currentItem.durationDaysExpected ||
      uploaded.durationDaysHigh !== currentItem.durationDaysHigh;

    entries.push({
      workItemCode: code,
      description: currentItem.description,
      // "added" means the organisation is pricing this for the first time — it is currently on
      // national rates. Whether the number moved is secondary to who now owns it.
      status:
        currentSource === "national"
          ? "added"
          : priceChanged || durationChanged
            ? "changed"
            : "unchanged",
      currentSource,
      currentExpectedGbp: currentItem.rateExpectedGbp,
      nextExpectedGbp: uploaded.rateExpectedGbp,
      deltaGbp: uploaded.rateExpectedGbp - currentItem.rateExpectedGbp,
      deltaPct: percentChange(currentItem.rateExpectedGbp, uploaded.rateExpectedGbp),
      durationChanged,
    });
  }

  entries.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0) ||
      a.workItemCode.localeCompare(b.workItemCode),
  );
  inheritedFromNational.sort();

  const count = (status: RateCardDiffStatus) =>
    entries.filter((entry) => entry.status === status).length;

  return {
    entries,
    inheritedFromNational,
    summary: {
      added: count("added"),
      changed: count("changed"),
      unchanged: count("unchanged"),
      removed: count("removed"),
      inherited: inheritedFromNational.length,
    },
  };
}

function percentChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}
