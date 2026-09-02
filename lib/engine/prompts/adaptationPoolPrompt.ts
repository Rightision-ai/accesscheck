import type { LahrBandId, LahrEvaluation } from "@/lib/accessibility/lahr/types";
import type { RateCardItem } from "@/lib/rate-cards/types";

export type TriggeredRule = {
  sectionId: string;
  sectionLabel: string;
  n: number;
  capBand: LahrBandId;
  description: string;
};

/**
 * The rules currently capping the band.
 *
 * `g_rules` is included deliberately: it is informational and can never cap the band, so the
 * caller filters it before pricing. Keeping it here preserves the previous behaviour for any
 * diagnostic use.
 */
export function collectTriggeredRules(evaluation: LahrEvaluation): TriggeredRule[] {
  return evaluation.criteria
    .flatMap((criterion) =>
      criterion.triggeredRules.map((rule) => ({
        sectionId: criterion.sectionId,
        sectionLabel: criterion.label,
        n: rule.n,
        capBand: rule.capBand,
        description: rule.description,
      })),
    )
    .sort((a, b) => a.n - b.n);
}

function rulesBlock(triggeredRules: TriggeredRule[]): string {
  if (triggeredRules.length === 0) {
    return "  (none — no rules are currently capping the band)";
  }
  return triggeredRules
    .map(
      (rule) =>
        `  - Rule #${rule.n} (section "${rule.sectionLabel}", caps the property at band ${rule.capBand}): ${rule.description}`,
    )
    .join("\n");
}

/**
 * The work items the model may choose from.
 *
 * Deliberately carries NO prices. The model's job is to pick the right work and the right
 * quantity for this property; anchoring it on a number would put it back in the business of
 * inventing costs, which is what made the old plans indefensible.
 */
function workItemsBlock(items: RateCardItem[]): string {
  return items
    .map((item) => {
      const rules = item.addressesRuleNumbers.join(", ");
      const requires = item.preconditions ? ` · requires: ${item.preconditions}` : "";
      return `  - ${item.workItemCode} — ${item.description}\n      unit: ${item.unit} · resolves rules ${rules}${requires}`;
    })
    .join("\n");
}

export function buildAdaptationPoolPrompt(args: {
  currentBand: LahrBandId;
  triggeredRules: TriggeredRule[];
  workItems: RateCardItem[];
}): string {
  const { currentBand, triggeredRules, workItems } = args;

  return `Role: You are a chartered UK home-adaptation surveyor writing for an Occupational Therapist who will commission an adaptation package for this dwelling.

Audience: An OT is the primary reader. They understand clinical need and tenant impact, but want the rationale in plain English — flowing sentences, specific to this property, grounded in what you can see.

Context:
- The property has been assessed against the Accessible Housing Rules (LAHR) framework. Its current band is **${currentBand}**.
- You are NOT choosing what fits a budget. Return every adaptation that is physically feasible on this property, in one flat list. The software selects which of them fit each funding tier, prices them from the council's schedule of rates, and projects the resulting band.
- Do not rank, bundle or total anything. Do not mention budgets, tiers or grant caps.

Accessible Housing Rules currently capping this property:
${rulesBlock(triggeredRules)}

Available work items — choose by code; the software prices each one from the council's schedule of rates:
${workItemsBlock(workItems)}

Your job, for each adaptation you propose:
- Pick the "work_item_code" that matches the work, and a "quantity" in the unit shown. Quantity is 1 for a whole job; use more only when the property genuinely needs several (e.g. three internal doors).
- Write a bespoke "label" for THIS property — "Convert the first-floor bathroom to a level-access wet room", not the catalogue description.
- Write a "narrative" of 1–2 full sentences describing what the work involves here and why it matters for the occupant. Tie it to what you can actually see in the floor plan or photographs. Do not restate cost, duration or trades — the software supplies those. No "Cost:" or "Duration:" labels. Prose, not a column dump.
- Set "feasibility" to "feasible" when the work is straightforwardly possible, "conditional" when it depends on something a surveyor must confirm on site, or "infeasible" when a visible constraint rules it out — then give "infeasible_reason".
- Set "verify_on_site" to true, with a specific "verify_note", whenever the evidence is not sufficient to commit (drainage falls, joist direction, run-out length, load-bearing walls, freeholder consent).
- Set "visual_evidence_confidence" between 0 and 1 to say how well the attached evidence supports your judgement.
- Use "depends_on" only for genuine sequencing — a work item whose id must be completed before this one is possible.

If work is genuinely needed but no work item code matches it, put it in "additional_works" with a short "proposed_work_item". It will be shown to the surveyor as requiring a quote. Never invent a work_item_code that is not in the list above.

Do not emit prices, durations, trades, difficulty ratings or survey field values. The software owns all of those.

Instructions:
1. Inspect the attached floor plan and evidence photographs.
2. For each capping rule, decide whether a work item above can resolve it on THIS property given the visible constraints (run-out length, load-bearing walls, ceiling void, drainage falls, freeholder consent).
3. Propose every feasible option, including alternatives that address the same rules — the software will choose between them.
4. Return strict JSON only, with no markdown and no commentary outside the JSON.

Also return:
- "overall_narrative": 2–4 sentences framing the adaptation strategy for an OT. Name the blocking issues in clinical and functional terms (mobility risk, bathing risk, transfer clearance, fall risk) and explain the strategy in prose, not as a list.
- "rationale_if_not_band_a": if a visible structural or spatial constraint means this property cannot reach band A whatever is spent, say so plainly. Otherwise omit it.`;
}

/**
 * Structured-output schema for the pool call.
 *
 * This is only expressible because the model no longer emits `field_patches` — Gemini's schema
 * subset has no way to describe an open map, and that was the single free-form field in the old
 * payload. With patches owned by the schedule of rates, the whole response is schema-constrained and
 * the JSON repairer drops back to a truncation-only safety net.
 */
export const ADAPTATION_POOL_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_narrative: { type: "STRING" },
    rationale_if_not_band_a: { type: "STRING" },
    candidates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          work_item_code: { type: "STRING" },
          quantity: { type: "NUMBER" },
          narrative: { type: "STRING" },
          feasibility: { type: "STRING", enum: ["feasible", "conditional", "infeasible"] },
          infeasible_reason: { type: "STRING" },
          verify_on_site: { type: "BOOLEAN" },
          verify_note: { type: "STRING" },
          visual_evidence_confidence: { type: "NUMBER" },
          depends_on: { type: "ARRAY", items: { type: "STRING" } },
        },
        propertyOrdering: [
          "id",
          "label",
          "work_item_code",
          "quantity",
          "narrative",
          "feasibility",
          "infeasible_reason",
          "verify_on_site",
          "verify_note",
          "visual_evidence_confidence",
          "depends_on",
        ],
        required: ["id", "label", "work_item_code", "quantity", "feasibility"],
      },
    },
    additional_works: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          proposed_work_item: { type: "STRING" },
          narrative: { type: "STRING" },
        },
        propertyOrdering: ["label", "proposed_work_item", "narrative"],
        required: ["label", "proposed_work_item"],
      },
    },
  },
  propertyOrdering: [
    "overall_narrative",
    "rationale_if_not_band_a",
    "candidates",
    "additional_works",
  ],
  required: ["overall_narrative", "candidates"],
} as const;
