import type {
  AdaptationCandidate,
  CostBasis,
  CostRange,
  LineConfidence,
} from "@/lib/adaptation-plans/types";
import type { RateCard, RateCardItem } from "./types";

/** A `each`-unit item is a whole job; metre/hour items scale much further. */
const MAX_QUANTITY: Record<string, number> = { each: 20, item: 20 };
const DEFAULT_MAX_QUANTITY = 200;

const CONFIDENCE_FLOOR = 0.05;
const CONFIDENCE_CEILING = 0.95;
/** A line the surveyor must confirm on site is worth less than one they need not. */
const VERIFY_ON_SITE_PENALTY = 0.15;

export type RawEngineCandidate = {
  id?: unknown;
  label?: unknown;
  work_item_code?: unknown;
  quantity?: unknown;
  narrative?: unknown;
  visual_evidence_confidence?: unknown;
  verify_on_site?: unknown;
  verify_note?: unknown;
  feasibility?: unknown;
  infeasible_reason?: unknown;
  depends_on?: unknown;
};

export function clampQuantity(value: unknown, unit: string): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) return 1;
  const max = MAX_QUANTITY[unit] ?? DEFAULT_MAX_QUANTITY;
  return Math.min(Math.max(Math.round(raw), 1), max);
}

export function clamp01(value: unknown, fallback = 0): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Price a quantity of a rate-card line.
 *
 * Each bound scales independently, so the spread widens with quantity — which is the honest
 * behaviour: three door widenings carry three times the uncertainty of one.
 */
export function priceItem(
  item: RateCardItem,
  quantity: number,
  regionMultiplier: number,
): CostRange {
  const scale = quantity * regionMultiplier;
  return {
    lowGbp: Math.round(item.rateLowGbp * scale),
    expectedGbp: Math.round(item.rateExpectedGbp * scale),
    highGbp: Math.round(item.rateHighGbp * scale),
  };
}

/**
 * Additional units of the same work overlap — a second door does not take a second full day.
 * Half the base duration per extra unit, rounded up, minimum one day.
 */
export function scaleDuration(baseDays: number, quantity: number): number {
  return Math.max(1, Math.round(baseDays * (1 + 0.5 * (quantity - 1))));
}

/**
 * Absence is not a caveat — an omitted feasibility means the model had nothing to flag. But a
 * value we do not recognise means we cannot tell what it meant, so it gets the caveat rather
 * than the benefit of the doubt.
 */
export function normaliseFeasibility(value: unknown): "feasible" | "conditional" {
  if (value === undefined || value === null || value === "feasible") return "feasible";
  return "conditional";
}

function buildConfidence(raw: RawEngineCandidate): LineConfidence {
  const verifyOnSite =
    raw.verify_on_site === true || normaliseFeasibility(raw.feasibility) === "conditional";
  const observed = Math.max(0.4, clamp01(raw.visual_evidence_confidence, 0.7));
  const score = Math.min(
    CONFIDENCE_CEILING,
    Math.max(CONFIDENCE_FLOOR, observed - (verifyOnSite ? VERIFY_ON_SITE_PENALTY : 0)),
  );
  return {
    score,
    basis: "rate_card_match",
    verifyOnSite,
    ...(typeof raw.verify_note === "string" && raw.verify_note.trim()
      ? { verifyNote: raw.verify_note.trim().slice(0, 300) }
      : {}),
  };
}

/**
 * Bind a model-proposed candidate to a rate-card line.
 *
 * Everything the card can answer, the card answers: cost, duration, difficulty, trades and —
 * critically — the field patches. The model contributes only judgement: which work item, how
 * many, why it suits this property, and how confident it is from the evidence. Its own
 * difficulty, trades and any patches it emits are discarded.
 *
 * `addressesRules` is intersected with the rules actually firing, so a line can never claim to
 * resolve something that was not capping the band in the first place.
 */
export function priceCandidate(args: {
  raw: RawEngineCandidate;
  item: RateCardItem;
  card: RateCard;
  triggeredRules: ReadonlySet<number>;
  id: string;
}): AdaptationCandidate {
  const { raw, item, card, triggeredRules, id } = args;
  const quantity = clampQuantity(raw.quantity, item.unit);

  const costBasis: CostBasis = {
    workItemCode: item.workItemCode,
    quantity,
    unit: item.unit,
    // Provenance comes from the ITEM, not the merged card: in a partial org card a
    // nationally-priced line would otherwise carry the council's card id and effective date
    // while showing the national label — three fields agreeing and one disagreeing.
    rateCardId: item.rateCardId ?? card.id,
    rateCardLabel: item.sourceLabel,
    // The multiplier stays card-level on purpose: it is an organisation policy that should
    // apply to inherited national lines too.
    regionMultiplier: card.regionMultiplier,
    effectiveFrom: item.effectiveFrom ?? card.effectiveFrom,
  };

  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim().slice(0, 200)
      : item.description;

  return {
    id,
    label,
    addressesRules: item.addressesRuleNumbers
      .filter((rule) => triggeredRules.has(rule))
      .sort((a, b) => a - b),
    cost: priceItem(item, quantity, card.regionMultiplier),
    costBasis,
    durationDays: scaleDuration(item.durationDaysExpected, quantity),
    difficulty: item.difficulty,
    // Copied, not shared: the card item is a long-lived singleton and a candidate must never
    // be able to mutate it.
    trades: [...item.trades],
    ...(typeof raw.narrative === "string" && raw.narrative.trim()
      ? { narrative: raw.narrative.trim().slice(0, 600) }
      : {}),
    ...(item.preconditions ? { preconditions: item.preconditions } : {}),
    confidence: buildConfidence(raw),
    fieldPatches: { ...item.fieldPatches },
    feasibility: normaliseFeasibility(raw.feasibility),
    dependsOn: [],
  };
}

export function formatCostRange(cost: CostRange): string {
  const gbp = (value: number) => `£${Math.round(value).toLocaleString("en-GB")}`;
  return cost.lowGbp === cost.highGbp
    ? gbp(cost.expectedGbp)
    : `${gbp(cost.lowGbp)}–${gbp(cost.highGbp)}`;
}
