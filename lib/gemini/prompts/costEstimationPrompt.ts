import type { LahrBandId, LahrEvaluation } from "@/lib/accessibility/lahr/types";
import type { DfgBudgetGbp } from "@/lib/accessibility/cost-estimation/types";
import fieldMapping from "@/lib/accessibility/lahr/tables/field-mapping.json";

type TriggeredRule = {
  sectionId: string;
  sectionLabel: string;
  n: number;
  capBand: LahrBandId;
  description: string;
};

export function collectTriggeredRules(evaluation: LahrEvaluation): TriggeredRule[] {
  const out: TriggeredRule[] = [];
  for (const c of evaluation.criteria) {
    for (const r of c.triggeredRules) {
      out.push({
        sectionId: c.sectionId,
        sectionLabel: c.label,
        n: r.n,
        capBand: r.capBand,
        description: r.description,
      });
    }
  }
  return out.sort((a, b) => a.n - b.n);
}

/** The set of `surveys` columns Gemini may reference inside `field_patches`.
 *  Sourced from the LAHR field-mapping so we never go out of sync with the classifier. */
function buildPatchableFieldsBlock(): string {
  const mapping = (fieldMapping as { mapping: Record<string, unknown> }).mapping;
  const cols = new Set<string>();
  for (const v of Object.values(mapping)) {
    if (typeof v === "string" && !v.startsWith("$")) {
      cols.add(v);
    } else if (v && typeof v === "object" && "column" in (v as Record<string, unknown>)) {
      const col = (v as { column?: unknown }).column;
      if (typeof col === "string") cols.add(col);
    }
  }
  return Array.from(cols).sort().join(", ");
}

export function buildCostEstimationPrompt(args: {
  currentBand: LahrBandId;
  triggeredRules: TriggeredRule[];
  budgets: readonly DfgBudgetGbp[];
}): string {
  const { currentBand, triggeredRules, budgets } = args;

  const rulesBlock = triggeredRules.length
    ? triggeredRules
        .map(
          (r) =>
            `  - Rule #${r.n} (section "${r.sectionLabel}", caps at ${r.capBand}): ${r.description}`,
        )
        .join("\n")
    : "  (none)";

  return `Role: You are a chartered UK home-adaptation surveyor writing for an Occupational Therapist who will commission a DFG (Disabled Facilities Grant) package for this dwelling.

Audience: An OT is the primary reader. They understand clinical need and tenant impact, but want the rationale expressed in plain English, not in a bullet/column table. Write as if you are briefing a colleague — flowing sentences, specific to this property, grounded in what you can see.

Context:
- The UK DFG funding ceiling is £30,000 per eligible dwelling.
- The property has been assessed against the LAHR (Local Authority Housing Register) 110-rule framework. The current LAHR band is **${currentBand}**.
- Because band ≠ A, propose, for each budget tier, the bundle of adaptations that best lifts the band within that tier's cap.

Triggered LAHR rules (what currently caps the band):
${rulesBlock}

Your job:
- Author adaptations from scratch, specific to THIS property as seen in the floor plan and photos.
- Do not pick from a catalogue — every adaptation you propose must be a bespoke recommendation grounded in the visual evidence.
- Cost in £GBP must be a realistic UK 2026 figure, calibrated to the property's actual scale (single-leaf vs double-leaf doors, hallway run length, stair geometry, bathroom footprint, etc.). Set duration_days to 0 — the consumer no longer surfaces it.
- For each adaptation provide a "field_patches" object with the post-adaptation values for the relevant survey fields, so the LAHR classifier can re-score the property. Without correct patches we cannot project the band uplift.

Patchable survey fields (use only these column names as keys inside field_patches):
${buildPatchableFieldsBlock()}

Patch value conventions:
- Booleans: true / false (e.g. has_property_ramp, has_through_floor_lift, has_separate_toilet, stair_70cm_clearance, has_level_access_shower, bathroom_turning_150x150).
- Threshold heights: one of "Level", "<1.5cm", "1.5-10cm", ">10cm".
- Widths and lengths: integer centimetres (e.g. property_door_opening_width: 85, hallway_width_head_on_cm: 120).
- Ramp gradient inputs: ramp_ah is rise in cm, ramp_al is run in cm; pick values whose ratio satisfies the relevant rule (1:15 = ah/al ≤ 0.067).
- Step / hazard counts: integer (e.g. internal_steps_count: 0).

Instructions:
1. Inspect the attached floor plan and evidence photos.
2. For each triggered rule, decide whether a feasible adaptation exists for THIS property given visible constraints (run-out length, load-bearing walls, ceiling void, drainage falls, freeholder consent, etc.). If no feasible adaptation exists, explain it in "dropped_candidates" with a specific, visually grounded reason.
3. For EACH budget in [${budgets.join(", ")}] (£):
   - Select the bundle of bespoke adaptations that fits within the tier's budget and maximises LAHR-band uplift. Never exceed the budget.
   - Higher tiers are usually supersets of lower tiers; re-plan only if a different combination beats the superset.
   - Tie-break order: shorter overall duration, then lower disruption (fewer "major" items).
4. Return strict JSON only — no markdown, no commentary outside the JSON.

Writing register for the narrative fields:
- "overall_narrative": 2–4 sentences framing the adoption strategy for an OT. Name the blocking issues in clinical / functional terms (mobility risk, bathing risk, transfer clearance, fall risk) and explain the strategy in prose, not as a list.
- Per-adaptation "narrative": 1–2 full sentences describing what the work involves in this specific property and why it matters for the tenant. Tie it to what you can actually see in the floor plan or photos. Do not restate cost, duration or trades — those live in their own fields. No "Cost:" / "Duration:" labels. Flowing prose.
- "rationale_if_not_band_a": Plain-English explanation of why £30K doesn't reach band A (if applicable) — reference the specific structural or spatial constraint you can see.

Output shape:
{
  "current_band": "${currentBand}",
  "overall_narrative": "Flowing 2–4 sentence briefing for an OT; avoid bullet formatting.",
  "tiers": [
    {
      "budget_gbp": 15000,
      "total_cost_gbp": 14800,
      "total_duration_days": 10,
      "overall_difficulty": "minor" | "moderate" | "major",
      "potential_band_estimate": "E",
      "adaptations": [
        {
          "label": "Short title for the adaptation, e.g. 'Widen entrance door to 85cm and re-hang'",
          "addresses_rules": [25, 26],
          "cost_gbp": 1800,
          "duration_days": 2,
          "difficulty": "minor" | "moderate" | "major",
          "trades": ["carpentry", "plastering"],
          "preconditions": "Optional — any site checks the surveyor must confirm before quoting.",
          "narrative": "1–2 full sentences in OT-appropriate prose. Grounded in the specific property.",
          "visual_evidence_confidence": 0.0,
          "field_patches": { "property_door_opening_width": 85, "communal_door_opening_width": 85 }
        }
      ],
      "dropped_candidates": [
        { "label": "Internal hallway widening", "reason": "Short prose reason tied to the visual evidence." }
      ]
    },
    { "budget_gbp": 20000, ... },
    { "budget_gbp": 30000, ... }
  ],
  "reaches_band_a_at_30k": true | false,
  "rationale_if_not_band_a": "Plain-English reason. Optional.",
  "confidence": 0.0
}

Hard rules:
- Each tier.total_cost_gbp MUST be ≤ that tier.budget_gbp.
- Return the tiers in the same order as the budgets: ${budgets.join(", ")}.
- Use plain JSON numbers (no currency symbols, no thousands separators).
- Narratives are prose, not column dumps. Never emit phrases like "Cost: £…", "Duration: … days", "Trades: …", "Difficulty: …" inside a narrative field.
- Every "field_patches" key must come from the Patchable survey fields list above. Do not invent column names.`;
}
