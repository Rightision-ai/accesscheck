import { priceCandidate, type RawEngineCandidate } from "@/lib/rate-cards/pricing";
import type { RateCard } from "@/lib/rate-cards/types";
import type {
  AdaptationCandidate,
  DroppedAdaptation,
  UnpricedWork,
} from "./types";

/** Beyond this the selector's pair look-ahead stops being cheap, and the model is padding. */
const DEFAULT_MAX_POOL_SIZE = 24;

export type ParsedPool = {
  pool: AdaptationCandidate[];
  additionalWorks: UnpricedWork[];
  dropped: DroppedAdaptation[];
  overallNarrative?: string;
  rationaleIfNotBandA?: string;
};

function asString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/** A stable, readable id. The selector's final tie-break sorts on it, so it must be total. */
function slugify(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value : "";
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

function asStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    .map((entry) => entry.trim())
    .slice(0, limit);
}

/**
 * Turn the engine's payload into a priced candidate pool.
 *
 * The model chooses a `work_item_code` and a quantity; everything that can affect a
 * classification — the field patches above all — comes from the schedule of rates. A payload that
 * carries its own `field_patches` is ignored rather than trusted, so a prompt regression cannot
 * reintroduce model-authored patches.
 *
 * Anything the card cannot price becomes `additionalWorks`: surfaced to the surveyor as
 * "quote required", but never selected, never costed into a tier and never patched into the
 * survey. An unpriced guess must not move a band.
 */
export function parseCandidatePool(args: {
  raw: unknown;
  rateCard: RateCard;
  triggeredRules: ReadonlySet<number>;
  maxPoolSize?: number;
}): ParsedPool {
  const { rateCard, triggeredRules } = args;
  const maxPoolSize = args.maxPoolSize ?? DEFAULT_MAX_POOL_SIZE;

  const payload = (args.raw ?? {}) as {
    candidates?: unknown;
    additional_works?: unknown;
    overall_narrative?: unknown;
    rationale_if_not_band_a?: unknown;
  };

  const rawCandidates: RawEngineCandidate[] = Array.isArray(payload.candidates)
    ? (payload.candidates.filter(
        (entry) => entry && typeof entry === "object",
      ) as RawEngineCandidate[])
    : [];

  const priced: AdaptationCandidate[] = [];
  const additionalWorks: UnpricedWork[] = [];
  const dropped: DroppedAdaptation[] = [];
  const usedIds = new Set<string>();

  rawCandidates.forEach((raw, index) => {
    const workItemCode = asString(raw.work_item_code, 80);
    const item = workItemCode ? rateCard.itemsByCode.get(workItemCode) : undefined;
    const label = asString(raw.label, 200);

    if (!item) {
      // No schedule-of-rates line prices this. Keep it visible, keep it out of the arithmetic.
      if (!label && !workItemCode) return;
      additionalWorks.push({
        label: label ?? workItemCode ?? "Unspecified additional work",
        ...(asString(raw.narrative, 600) ? { narrative: asString(raw.narrative, 600) } : {}),
        proposedWorkItem: workItemCode ?? "unspecified",
        reason: "No schedule-of-rates line matches this work — obtain a quote.",
      });
      return;
    }

    if (raw.feasibility === "infeasible") {
      dropped.push({
        label: label ?? item.description,
        reason:
          asString(raw.infeasible_reason, 400) ??
          "Not feasible on this property from the visible evidence.",
      });
      return;
    }

    // A work item can only appear once — the same wet room is not two candidates.
    if (usedIds.has(item.workItemCode)) return;

    let id = slugify(raw.id, item.workItemCode);
    if (usedIds.has(id)) id = `${id}-${index}`;
    usedIds.add(id);
    usedIds.add(item.workItemCode);

    priced.push(priceCandidate({ raw, item, card: rateCard, triggeredRules, id }));
  });

  // Resolve dependsOn only among candidates that survived, and never onto itself.
  const byId = new Map(priced.map((candidate) => [candidate.id, candidate]));
  for (const [index, candidate] of priced.entries()) {
    const declared = asStringArray(rawCandidates[index]?.depends_on, 4);
    candidate.dependsOn = declared
      .map((value) => slugify(value, value))
      .filter((value) => value !== candidate.id && byId.has(value));
  }

  // Trim by the card's own priority, then cost, then id — never by model order.
  const pool = priced
    .sort((a, b) => {
      const priorityA = rateCard.itemsByCode.get(a.costBasis.workItemCode!)?.priorityHint ?? 999;
      const priorityB = rateCard.itemsByCode.get(b.costBasis.workItemCode!)?.priorityHint ?? 999;
      return (
        priorityA - priorityB ||
        a.cost.expectedGbp - b.cost.expectedGbp ||
        a.id.localeCompare(b.id)
      );
    })
    .slice(0, maxPoolSize);

  // A dependency trimmed away would strand its dependant, so drop those links too.
  const keptIds = new Set(pool.map((candidate) => candidate.id));
  for (const candidate of pool) {
    candidate.dependsOn = candidate.dependsOn.filter((id) => keptIds.has(id));
  }

  return {
    pool,
    additionalWorks: additionalWorks.slice(0, 12),
    dropped: dropped.slice(0, 12),
    ...(asString(payload.overall_narrative, 1200)
      ? { overallNarrative: asString(payload.overall_narrative, 1200) }
      : {}),
    ...(asString(payload.rationale_if_not_band_a, 800)
      ? { rationaleIfNotBandA: asString(payload.rationale_if_not_band_a, 800) }
      : {}),
  };
}
