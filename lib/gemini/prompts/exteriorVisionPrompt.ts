/**
 * Prompt for exterior accessibility analysis of Street View imagery. Kept in the prompts module
 * alongside the other Gemini prompts (lib/gemini/prompts/).
 */
export function buildExteriorVisionPrompt(): string {
  return `You are an accessibility surveyor analysing exterior photographs of a UK residential property
(from street-level imagery). Identify ONLY what is clearly visible at the property's pedestrian entrance.
Be conservative: if something is not clearly visible, use "unknown" and lower your confidence. Never guess.

Return STRICT JSON only (no prose, no markdown) with exactly these keys:
{
  "entrance_visible": boolean,            // is the property's own entrance door/path clearly in frame?
  "visible_steps_count": number|null,    // count of steps at the entrance approach; null if not visible
  "ramp_visible": boolean,               // a ramp at the entrance
  "handrail_visible": boolean,           // a handrail beside steps/ramp
  "front_path_slope": "flat"|"slight_slope"|"steady_slope"|"steep_slope"|"unknown",
  "threshold_risk": "low"|"medium"|"high"|"unknown",   // raised door threshold trip/step risk
  "visual_property_type": string|null,   // e.g. "terraced_house", "flat_block", "bungalow"
  "communal_entrance_visible": boolean,  // a shared/communal building entrance rather than a private door
  "parking_or_dropoff_visible": boolean,
  "image_quality": "low"|"medium"|"high"|"unknown",
  "confidence": number,                  // 0..1 overall confidence in the above
  "justification": string                // one or two sentences citing what you saw
}

Rules:
- Do not infer internal features (door widths, bathrooms) — those are not visible from outside.
- If imagery is obstructed, distant, or low quality, set image_quality accordingly and reduce confidence.
- visible_steps_count is the number of steps a wheelchair user would face at the entrance.`;
}
