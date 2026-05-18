import type { LahrBandId, LahrEvaluation } from "@/lib/accessibility/lahr/types";
import type { DfgBudgetGbp } from "@/lib/accessibility/cost-estimation/types";
import fieldMapping from "@/lib/accessibility/lahr/tables/field-mapping.json";
import { buildResolutionsBlock } from "@/lib/accessibility/cost-estimation/ruleRecipes";

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

  // For every triggered rule we attach the minimum field-patch recipe(s) that resolve it.
  // Without these the model frequently emits patches that don't actually flip the rule (e.g.
  // toggles a boolean but forgets the related dimensions), so the projected band stays stuck.
  const rulesBlock = buildResolutionsBlock(triggeredRules);

  return `Role: You are a chartered UK home-adaptation surveyor writing for an Occupational Therapist who will commission a DFG (Disabled Facilities Grant) package for this dwelling.

Audience: An OT is the primary reader. They understand clinical need and tenant impact, but want the rationale expressed in plain English, not in a bullet/column table. Write as if you are briefing a colleague — flowing sentences, specific to this property, grounded in what you can see.

Context:
- The UK DFG funding ceiling is £30,000 per eligible dwelling.
- The property has been assessed against the LAHR (Local Authority Housing Register) 110-rule framework. The current LAHR band is **${currentBand}**.
- Because band ≠ A, propose, for each budget tier, the bundle of adaptations that best lifts the band within that tier's cap.

Triggered Accessible Housing Rules (what currently caps the band, with the EXACT field_patches required to resolve each):
${rulesBlock}

Your job:
- Author adaptations specific to THIS property as seen in the floor plan and photos. Bespoke labels and narratives — not catalogue copy.
- Cost in £GBP must be a realistic UK 2026 figure, calibrated to the property's actual scale (single-leaf vs double-leaf doors, hallway run length, stair geometry, bathroom footprint, etc.). Set duration_days to 0 — the consumer no longer surfaces it.
- **Critical for band uplift**: for each adaptation, the "field_patches" object MUST include every key from the recipe(s) of the rules that adaptation claims to address. Patching only one boolean (e.g. has_property_ramp:true without the gradient values) will leave the rule still triggering and the band will not move. Use the recipe map above as the floor — you may add extra related fields, but never fewer.
- An adaptation that does not push at least one triggered rule below its cap is useless. Skip it.
- Every tier MUST contain at least one adaptation if any meaningful improvement is feasible at that budget. Prefer to under-spend a tier (e.g. one £600 grab-rail in the £15K tier) over leaving it empty.
- If — and only if — no feasible adaptation exists at a tier's budget (cheapest meaningful work for THIS property genuinely costs more than the tier cap, OR structural/freeholder/spatial constraints make every option infeasible), set "adaptations": [] AND populate "tier_unavailable_reason" with a 1–2 sentence plain-English explanation tied to what you can see in the evidence (e.g. "The smallest viable wet-room conversion for this bathroom is £6,200, leaving no headroom for the through-floor lift this property needs to address its upstairs bedroom — both works only become viable in the £20K+ tier"). Never leave both empty without a reason.

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
3. TIERS ARE STRICTLY CUMULATIVE — each tier is the tier below it plus more:
   - £${budgets[0].toLocaleString()} tier: Propose adaptations whose total cost is ≤ £${budgets[0].toLocaleString()}.
${budgets.slice(1).map((b, idx) => `   - £${b.toLocaleString()} tier: COPY every adaptation from the £${budgets[idx].toLocaleString()} tier VERBATIM (same label, same cost, same field_patches), then add NEW adaptations that bring the running total to between £${budgets[idx].toLocaleString()} and £${b.toLocaleString()}. Never exceed £${b.toLocaleString()}.`).join("\n")}
   - The additional adaptations added in each higher tier should target the gap between the previous tier's cap and this tier's cap (e.g. if £15K plan totals £12K, the £20K tier should add ~£3K–£8K of new work).
   - Tie-break for new adaptations: maximise LAHR-band uplift first, then shorter duration, then lower disruption.
4. Return strict JSON only — no markdown, no commentary outside the JSON.

Writing register for the narrative fields:
- "overall_narrative": 2–4 sentences framing the adoption strategy for an OT. Name the blocking issues in clinical / functional terms (mobility risk, bathing risk, transfer clearance, fall risk) and explain the strategy in prose, not as a list.
- Per-adaptation "narrative": 1–2 full sentences describing what the work involves in this specific property and why it matters for the tenant. Tie it to what you can actually see in the floor plan or photos. Do not restate cost, duration or trades — those live in their own fields. No "Cost:" / "Duration:" labels. Flowing prose.
- "rationale_if_not_band_a": Plain-English explanation of why £30K doesn't reach band A (if applicable) — reference the specific structural or spatial constraint you can see.

Output shape (note the cumulative structure — each higher tier lists all lower-tier adaptations verbatim plus new ones):
{
  "current_band": "${currentBand}",
  "overall_narrative": "Flowing 2–4 sentence briefing for an OT; avoid bullet formatting.",
  "tiers": [
    {
      "budget_gbp": 15000,
      "total_cost_gbp": 12600,
      "total_duration_days": 8,
      "overall_difficulty": "minor" | "moderate" | "major",
      "potential_band_estimate": "E",
      "adaptations": [
        {
          "label": "Adaptation A — specific to this property",
          "addresses_rules": [25, 26],
          "cost_gbp": 1800,
          "duration_days": 2,
          "difficulty": "minor" | "moderate" | "major",
          "trades": ["carpentry"],
          "preconditions": "Optional site checks.",
          "narrative": "1–2 full sentences in OT-appropriate prose.",
          "visual_evidence_confidence": 0.0,
          "field_patches": { "property_door_opening_width": 85 }
        }
      ],
      "dropped_candidates": [{ "label": "Internal hallway widening", "reason": "Reason." }],
      "tier_unavailable_reason": "Only if adaptations is empty."
    },
    {
      "budget_gbp": 20000,
      "total_cost_gbp": 18400,
      "total_duration_days": 14,
      "overall_difficulty": "minor" | "moderate" | "major",
      "potential_band_estimate": "D",
      "adaptations": [
        { "label": "Adaptation A — COPIED FROM £15K TIER VERBATIM", "addresses_rules": [25, 26], "cost_gbp": 1800, "duration_days": 2, "difficulty": "minor", "trades": ["carpentry"], "narrative": "...", "field_patches": { "property_door_opening_width": 85 } },
        { "label": "Adaptation B — NEW for this tier, bridging £12,600 → £18,400", "addresses_rules": [44], "cost_gbp": 5800, "duration_days": 4, "difficulty": "moderate", "trades": ["mechanical"], "narrative": "...", "field_patches": { "has_stair_lift": true } }
      ],
      "dropped_candidates": [],
      "tier_unavailable_reason": null
    },
    {
      "budget_gbp": 30000,
      "total_cost_gbp": 27200,
      "total_duration_days": 22,
      "overall_difficulty": "moderate" | "major",
      "potential_band_estimate": "C",
      "adaptations": [
        { "label": "Adaptation A — COPIED FROM £15K TIER", "cost_gbp": 1800, ... },
        { "label": "Adaptation B — COPIED FROM £20K TIER", "cost_gbp": 5800, ... },
        { "label": "Adaptation C — NEW for this tier, bridging £18,400 → £27,200", "addresses_rules": [64], "cost_gbp": 8800, "duration_days": 6, "difficulty": "major", "trades": ["plumbing", "tiling"], "narrative": "...", "field_patches": { "bathroom_has_level_access_shower": true } }
      ],
      "dropped_candidates": [],
      "tier_unavailable_reason": null
    }
  ],
  "reaches_band_a_at_30k": true | false,
  "rationale_if_not_band_a": "Plain-English reason. Optional.",
  "confidence": 0.0
}

Hard rules:
- Each tier.total_cost_gbp MUST be ≤ that tier.budget_gbp.
- Each tier (except the first) MUST include ALL adaptations from the tier below it, copied verbatim (same label, same cost_gbp, same field_patches). Omitting a lower-tier adaptation from a higher tier is an error.
- The total_cost_gbp for each tier must be ≥ the budget_gbp of the previous tier wherever feasible (fill the gap with new adaptations). If no more feasible work exists, explain in tier_unavailable_reason and set adaptations to only the carried-forward ones.
- Return the tiers in the same order as the budgets: ${budgets.join(", ")}.
- Use plain JSON numbers (no currency symbols, no thousands separators).
- Narratives are prose, not column dumps. Never emit phrases like "Cost: £…", "Duration: … days", "Trades: …", "Difficulty: …" inside a narrative field.
- Every "field_patches" key must come from the Patchable survey fields list above. Do not invent column names.`;
}
