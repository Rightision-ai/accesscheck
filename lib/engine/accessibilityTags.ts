/**
 * Canonical schema for the 15 accessibility tags — TypeScript mirror of
 * training/accessibility_sft/label_schema.py. Keep the two in sync: the fine-tuned model is
 * trained against these exact enum values, so the app must validate against the same sets.
 *
 * `unknown` is the abstention sentinel (feature not assessable from the images).
 */

export const ACCESSIBILITY_TAG_ENUMS = {
  entrance_path: ["Flat/No steps", "Steady slope", "Steep slope", "Few steps", "Steps", "Stairs with turns"],
  entrance_threshold: ["0 - 1.5 cm", "1.5 - 10 cm", "+ 10 cm"],
  entrance_door_width: ["Less than 76cm", "More than 76cm"],
  internal_levels: ["All on one level", "Straight, 1 handrail", "Straight, 2 handrails", "Stairs with turns", "No, requires stairs"],
  hallway_width: ["Standard", "Accessible"],
  ground_facilities: ["Bedroom, Bath, & Kitchen on level", "No, requires stairs"],
  shower_type: ["Shower no steps", "Cubicle with step", "Shower over bath", "Bath only"],
  shower_dimensions: ["Less than 900x900", "900x900 - 1200-900", "More than 1200x1200"],
  bathroom_door_width: ["Less than 73cm", "73cm - 90cm", "Over 90cm"],
  turning_space: ["Insufficient", "150x150 sufficient"],
  toilet_type: ["Standard", "Wash & Dry"],
  toilet_transfer_space: ["No Space", "Enough space beside toilet"],
  garden_access: ["Flat/No steps", "Steady slope", "Threshold/Tracks", "Step", "Steps", "Few steps"],
  balcony_access: ["Flat/Flush", "Threshold/Tracks", "Step", "Steps"],
  grab_bars: ["No grab bars", "Grab bars installed"],
} as const;

export const UNKNOWN = "unknown" as const;

export type AccessibilityTag = keyof typeof ACCESSIBILITY_TAG_ENUMS;
export const ACCESSIBILITY_TAGS = Object.keys(ACCESSIBILITY_TAG_ENUMS) as AccessibilityTag[];

/** A validated tag value: one of the tag's enum members, or "unknown". */
export type TagValue<T extends AccessibilityTag> =
  | (typeof ACCESSIBILITY_TAG_ENUMS)[T][number]
  | typeof UNKNOWN;

export type AccessibilityTags = { [T in AccessibilityTag]: TagValue<T> };

/** Coerce a raw model value to a valid enum member, else "unknown" (never throws). */
export function coerceTag<T extends AccessibilityTag>(tag: T, raw: unknown): TagValue<T> {
  if (typeof raw !== "string") return UNKNOWN;
  const allowed = ACCESSIBILITY_TAG_ENUMS[tag] as readonly string[];
  return (allowed.includes(raw) ? raw : UNKNOWN) as TagValue<T>;
}

/** Normalise a raw JSON object from the model into a full, validated tag record. */
export function normaliseTags(raw: Record<string, unknown>): AccessibilityTags {
  const out = {} as AccessibilityTags;
  for (const tag of ACCESSIBILITY_TAGS) {
    (out as Record<string, string>)[tag] = coerceTag(tag, raw?.[tag]);
  }
  return out;
}

/** Human-readable enum spec injected into the model prompt (mirrors output_schema_text()). */
export function tagSchemaText(): string {
  const lines = ACCESSIBILITY_TAGS.map((tag) => {
    const opts = ACCESSIBILITY_TAG_ENUMS[tag].map((v) => `"${v}"`).join(" | ");
    return `  "${tag}": ${opts} | "${UNKNOWN}"`;
  });
  return `{\n${lines.join(",\n")}\n}`;
}

/**
 * System prompt for the tagger. `omitUnknown` MUST match how the model was tuned
 * (see training/accessibility_sft/prompt.py build_system_instruction).
 */
export function buildAccessibilityTagsPrompt(omitUnknown = false): string {
  const abstain = omitUnknown
    ? '- OMIT any feature you cannot determine from the images. Include a key only when you can assess it. Do not guess and do not output "unknown".'
    : '- Use "unknown" for any feature that is not assessable from the provided images. Do not guess: abstaining with "unknown" is correct when evidence is absent.';
  return [
    "You are an expert housing accessibility surveyor. You are given the full set of photographs",
    "(and any floor plans) for a single UK residential property. From these images alone, determine",
    "each accessibility feature below.",
    "",
    "Return STRICT JSON only — no prose, no markdown fences — using only values from the allowed sets:",
    "",
    tagSchemaText(),
    "",
    "Rules:",
    abstain,
    "- Consider every image: bathrooms determine shower/toilet/grab-bar fields; entrances and exterior",
    "  shots determine entrance path/threshold/door width; floor plans and hallway shots determine",
    "  internal levels, hallway width and ground-floor facilities.",
    "- Output the JSON object and nothing else.",
  ].join("\n");
}
