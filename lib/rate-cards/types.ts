export type Difficulty = "minor" | "moderate" | "major";

export type RateCardUnit = "each" | "item" | "m" | "m2" | "hour";

export const RATE_CARD_UNITS: readonly RateCardUnit[] = [
  "each",
  "item",
  "m",
  "m2",
  "hour",
] as const;

/**
 * One priced line of work.
 *
 * `fieldPatches` lives here, not on the model's output. Gemini selects a `workItemCode` and a
 * quantity; the patches that move the classifier come from this table, hand-validated and
 * covered by tests. That is what stops the prompt's whitelist and its recipe map contradicting
 * each other, which is how ramp adaptations ended up unable to move a gradient.
 */
export type RateCardItem = {
  id: string;
  workItemCode: string;
  description: string;
  unit: RateCardUnit;
  rateLowGbp: number;
  rateExpectedGbp: number;
  rateHighGbp: number;
  durationDaysLow: number;
  durationDaysExpected: number;
  durationDaysHigh: number;
  difficulty: Difficulty;
  trades: string[];
  /** LAHR rule numbers this work resolves. */
  addressesRuleNumbers: number[];
  preconditions: string | null;
  fieldPatches: Record<string, unknown>;
  /** Lower sorts first when the pool is trimmed. */
  priorityHint: number;
  /** Printed verbatim in the UI and export: "Priced from: …". */
  sourceLabel: string;
  /** The card this row actually came from — null for the built-in national fallback. In a
   *  merged card some rows are the organisation's and some are national, so provenance has to
   *  travel with the row rather than being read off the card. */
  rateCardId: string | null;
  effectiveFrom: string;
};

/** A versioned set of rates. `organisationId: null` is the AccessCheck estimation card. */
export type RateCard = {
  id: string | null;
  organisationId: string | null;
  code: string;
  label: string;
  /** Version of the organisation's card, or null when running on national rates alone. */
  version: number | null;
  /** The organisation's own card id, so the UI can mark which rows are theirs. */
  ownedCardId: string | null;
  regionMultiplier: number;
  effectiveFrom: string;
  items: RateCardItem[];
  itemsByCode: ReadonlyMap<string, RateCardItem>;
};

export function indexByCode(
  items: RateCardItem[],
): ReadonlyMap<string, RateCardItem> {
  return new Map(items.map((item) => [item.workItemCode, item]));
}
