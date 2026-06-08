import {
  normalizeBathingType,
  normalizeToiletType,
} from "@/lib/utils/normalizeAiOutputs";

export type InferredAnswers = {
  Q2_Stairs: string;
  Q3_Entrance: string;
  Q4_Garden: string;
  Q5_DoorWidth: string;
  Q7_BathroomDoor: string;
  Q8_ShowerType: string;
  Q9_ShowerSize: string;
  Q11_WashDryToilet: string;
};

export const buildAnalyzeSectionsPrompt = (
  imageCount: number,
  categories: string[],
): string => `Role: You are an expert housing accessibility surveyor.

Task: Analyze the attached property photos, floor plans, and external maps/elevations.
Based on these visual assets, extract as much information as possible to partially complete an Official Accessibility Survey Report.

Input set:
- Total images: ${imageCount}
- Image order/categories: ${categories.join(", ")}

Core instructions:
1) Cross-reference assets
- Use floor plans for room relationships and level layout.
- Use photos/maps/elevations for real-world physical features (stairs, thresholds, adaptations).

2) Handling dimensions
- Exact on-site measurement is not possible from photos.
- For each measurement field, provide:
  - a best visual numeric estimate in cm where possible (or null), and
  - a companion note in this exact format:
    "Estimate: [value or range] - Requires on-site verification."

3) Strict Yes/No rule
- If a feature is not explicitly visible/detectable, default to "No".
- Never use "Unseen", "Not sure", or blank.
- For boolean fields use true/false only.

Extract and infer using these sections:

SECTION C: General Information & Adaptations
- Property type (house, flat, bungalow, etc.)
- Entrance level (ground, basement, other)
- Bedrooms count
- Major adaptations visible: through-floor lift, step-lift, level access shower, ceiling track hoist, stair-lift (Y/N)
- Canonical output requirement for wizard:
  - property_type: one of "House" | "Bungalow" | "Flat" | "Maisonette"
  - entrance_level: one of "Ground Floor" | "Upper Floor" | "Basement"
  - bedroom_count: integer when visible, else null
- Use floor-plan labels and external elevations first to infer property_type/entrance_level.
- Do not output synonyms such as apartment/duplex/lower-ground; map to canonical values above.

SECTION D: Entrances & Ramps
- Communal/property front door has steps or ramp (Y/N)
- Threshold type and estimated threshold heights
- Communal lift detection (assess the most useful lift for property access):
  - communal_lift_present: true/false
  - communal_lift_type: "Passenger" | "Platform" | "None"
  - communal_lifts_option: "No" | "Yes - Passenger" | "Yes - Platform"
- If no communal lift evidence is visible, set communal_lift_present=false, communal_lift_type="None", communal_lifts_option="No".

SECTION E & F: Internal Layout & Facilities
- Facilities on access/above/below level (Bed 1, Bed 2, Bathroom no toilet, Separate toilet, Living room, Kitchen, Other room, Combined bath & toilet)
- Internal stairs (to access other floors): detect from floor-plan stair symbols and staircase photos.
- Internal stairs details required: has_stairs, stair_type (Straight | Quarter Turn | Half Turn | Spiral | Winding), handrails (None | Left Side | Right Side | Both Sides), stair_lift_present.
- Bathroom facilities required: bathing_type (Bath Only | Over-Bath Shower | Shower Cubicle | Level Access Shower), toilet_type (Standard | Raised Height | Wash/Dry (Smart)), bathroom_location (Ground Floor | First Floor | Split Level | Second Floor+).
- If bath and shower are both visible, set bathing_type to Over-Bath Shower only when shower is over a bathtub, otherwise Shower Cubicle.
- Second exit / garden / balcony access (Y/N)
- Kitchen separate from living (Y/N), turning space estimates
- Bathroom/toilet layout, level-access shower (Y/N), turning space (Y/N)

SECTION F: Parking & Proximity
- Carport/garage/designated parking bay (Y/N)

Summary & Comments
- Provide brief 2-3 sentence accessibility summary based only on visible evidence.
- Highlight obvious physical barriers and adaptability potential.

Output constraints:
- Return JSON only (no markdown).
- Keep existing machine-readable structure so app can auto-fill fields.
- DO NOT return section-heading keys such as "general_information", "internal_layout_and_circulation", etc.
- The "results" object must contain one key per input category from: ${categories.join(", ")}.
- For categories with no evidence, still return the category key with valid=false and an empty data object.
- If category "entrance" exists, include both property_type and entrance_level in results.entrance.data.

Return this exact top-level shape:
{
  "results": {
    "<category>": {
      "valid": boolean,
      "reason": "string",
      "data": { "field": value, "...": "..." },
      "confidence": { "field": 0.0 }
    }
  },
  "safety": {
    "second_exit_suggested": boolean,
    "suggested_hazards": "comma separated"
  }
}

Required data fields (where relevant) inside each category data:
- property_type ("House" | "Bungalow" | "Flat" | "Maisonette")
- entrance_level ("Ground Floor" | "Upper Floor" | "Basement")
- bedroom_count
- communal_front_door_steps_count
- communal_front_door_threshold_height_cm
- communal_front_door_threshold_height_note
- communal_front_door_opening_width_cm
- communal_front_door_opening_width_note
- property_front_door_steps_count
- property_front_door_threshold_height_cm
- property_front_door_threshold_height_note
- property_front_door_opening_width_cm
- property_front_door_opening_width_note
- communal_lift_internal_width_cm
- communal_lift_internal_width_note
- communal_lift_internal_depth_cm
- communal_lift_internal_depth_note
- communal_lift_door_opening_width_cm
- communal_lift_door_opening_width_note
- communal_lift_present
- communal_lift_type ("Passenger" | "Platform" | "None")
- communal_lifts_option ("No" | "Yes - Passenger" | "Yes - Platform")
- internal_steps_count
- internal_stair_width_cm
- internal_stair_width_note
- internal_step_height_cm
- internal_step_height_note
- second_exit_present
- second_exit_access_to_street
- second_exit_steps_count
- second_exit_threshold_band ("10cm or above" | "Under 10cm and above 1.5cm" | "0 - 1.5cm")
- second_exit_door_opening_width_cm
- second_exit_door_opening_width_note
- hallway_head_on_width_cm
- hallway_head_on_width_note
- hallway_turn_width_cm
- hallway_turn_width_note
- separate_toilet_dimensions_width_cm
- separate_toilet_dimensions_width_note
- separate_toilet_dimensions_depth_cm
- separate_toilet_dimensions_depth_note
- separate_toilet_count
- separate_toilet_lateral_space_cm
- separate_toilet_lateral_space_note
- bathroom_dimensions_width_cm
- bathroom_dimensions_width_note
- bathroom_dimensions_depth_cm
- bathroom_dimensions_depth_note
- bathroom_toilet_lateral_space_cm
- bathroom_toilet_lateral_space_note
- door_opening_width_living_room_cm
- door_opening_width_living_room_note
- door_opening_width_kitchen_cm
- door_opening_width_kitchen_note
- door_opening_width_bed_1_cm
- door_opening_width_bed_1_note
- door_opening_width_bed_2_cm
- door_opening_width_bed_2_note
- door_opening_width_bed_3_cm
- door_opening_width_bed_3_note
- door_opening_width_separate_toilet_cm
- door_opening_width_separate_toilet_note
- door_opening_width_bathroom_cm
- door_opening_width_bathroom_note
- door_opening_width_balcony_cm
- door_opening_width_balcony_note
- facilities_access_level (Y/N map or list)
- facilities_above_level (Y/N map or list)
- facilities_below_level (Y/N map or list)
- can_be_adapted
- adaptability_comments
- has_stairs
- stair_type
- handrails
- stair_lift_present
- bathing_type
- toilet_type
- bathroom_location`;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const hasDoorWidthAbove = (
  primary: unknown,
  fallback: unknown,
  threshold: number,
): boolean | null => {
  const a = toNumber(primary);
  const b = toNumber(fallback);
  const pick = a ?? b;
  return pick === null ? null : pick > threshold;
};

export const deriveInferredAnswersFromAssessment = (
  wizardData: Record<string, any>,
  aiSuggestions: Record<string, any> = {},
): InferredAnswers => {
  const internalStairs = wizardData.internalStairs;
  const stairsType = String(wizardData.internalStairsType || "").toLowerCase();
  const handrails = String(wizardData.internalHandrails || "").toLowerCase();

  const hasEntranceSteps =
    (toNumber(aiSuggestions.property_front_door_steps_count) ??
      toNumber(wizardData.propertyDoorSteps) ??
      0) > 0 ||
    (toNumber(aiSuggestions.communal_front_door_steps_count) ??
      toNumber(wizardData.communalDoorSteps) ??
      0) > 0;
  const hasRamp =
    aiSuggestions.ramp_present === true || wizardData.propertyRampPresent === "Y";

  const propertyDoorWide = hasDoorWidthAbove(
    aiSuggestions.property_front_door_opening_width_cm,
    wizardData.propertyDoorWidth,
    76,
  );
  const bathroomDoorWidth = hasDoorWidthAbove(
    aiSuggestions.door_opening_width_bathroom_cm,
    wizardData.doorBathroomWidth,
    90,
  );
  const bathroomDoorMid = hasDoorWidthAbove(
    aiSuggestions.door_opening_width_bathroom_cm,
    wizardData.doorBathroomWidth,
    73,
  );

  const bathingType = normalizeBathingType(wizardData.bathingType);
  const toiletType = normalizeToiletType(wizardData.toiletType);
  const bathroomWidth =
    toNumber(aiSuggestions.bathroom_dimensions_width_cm) ??
    toNumber(wizardData.bathroomWidthCm);
  const bathroomDepth =
    toNumber(aiSuggestions.bathroom_dimensions_depth_cm) ??
    toNumber(wizardData.bathroomLengthCm);
  const minBathroomSide = Math.min(
    bathroomWidth ?? Number.MAX_SAFE_INTEGER,
    bathroomDepth ?? Number.MAX_SAFE_INTEGER,
  );

  return {
    Q2_Stairs:
      internalStairs !== "Yes"
        ? "All on one level"
        : stairsType.includes("straight")
          ? handrails.includes("both")
            ? "Straight stairs, both handrails"
            : "Straight stairs, one handrail"
          : "Staircase that turns",
    Q3_Entrance: hasEntranceSteps
      ? "Few steps"
      : hasRamp
        ? "Steady slope"
        : "No steps, flat",
    Q4_Garden:
      wizardData.gardenAccess === "No"
        ? "No steps, flat"
        : (toNumber(aiSuggestions.garden_steps_count) ??
              toNumber(wizardData.gardenSteps) ??
              0) > 0
          ? "Steps to garden"
          : "No steps, flat",
    Q5_DoorWidth:
      propertyDoorWide === null || propertyDoorWide ? "More than 76 cm" : "Less than 76 cm",
    Q7_BathroomDoor:
      bathroomDoorWidth === true
        ? "Over 90 cm"
        : bathroomDoorMid === true
          ? "73–90 cm"
          : "Less than 73 cm",
    Q8_ShowerType: String(bathingType || "").toLowerCase().includes("level access")
      ? "Shower, no steps"
      : String(bathingType || "").toLowerCase().includes("cubicle")
        ? "Shower cubicle with step"
        : String(bathingType || "").toLowerCase().includes("over-bath")
          ? "Shower over bath"
          : String(bathingType || "").toLowerCase().includes("bath only")
            ? "Bath only, no shower"
            : "Shower, no steps",
    Q9_ShowerSize:
      minBathroomSide < 900
        ? "Less than 900×900 mm"
        : minBathroomSide > 1200
          ? "More than 1200×1200 mm"
          : "900×900–1200×1200 mm",
    Q11_WashDryToilet: toiletType === "Wash/Dry (Smart)"
      ? "Have wash/dry toilet"
      : "No wash/dry toilet",
  };
};

export const buildFinalReportPrompt = ({
  wizardData,
  inferredAnswers,
  observations = [],
  analysisData = {},
}: {
  wizardData: Record<string, any>;
  inferredAnswers: InferredAnswers;
  observations?: Array<Record<string, any>>;
  analysisData?: Record<string, any>;
}): string => {
  const observationText =
    observations.length > 0
      ? observations
          .map(
            (obs) =>
              `- [${obs.category || "General"}] ${obs.content || ""} (${obs.authorName || "Unknown"})`,
          )
          .join("\n")
      : "- None";

  return `You are an OT analysis assistant.
Generate a FINAL ANALYSIS REPORT from extracted property data.
Do NOT calculate any accessibility score and do NOT output a grade.

MANDATORY USER CONTEXT:
- Q1 (Mobility): ${wizardData.mobility || "Unknown"}
- Q6 (Bathing): ${wizardData.bathing || "Unknown"}
- Q10 (Toileting): ${wizardData.toileting || "Unknown"}

INFERRED ANSWERS:
- Q2 (Stairs): ${inferredAnswers.Q2_Stairs}
- Q3 (Entrance): ${inferredAnswers.Q3_Entrance}
- Q4 (Garden): ${inferredAnswers.Q4_Garden}
- Q5 (Door Width): ${inferredAnswers.Q5_DoorWidth}
- Q7 (Bathroom Door): ${inferredAnswers.Q7_BathroomDoor}
- Q8 (Shower Type): ${inferredAnswers.Q8_ShowerType}
- Q9 (Shower Size): ${inferredAnswers.Q9_ShowerSize}
- Q11 (Wash/Dry Toilet): ${inferredAnswers.Q11_WashDryToilet}

EXTRACTED SECTION DATA:
${JSON.stringify(analysisData, null, 2)}

PROFESSIONAL OBSERVATIONS:
${observationText}

Return JSON only with this exact structure:
{
  "Confidence": "HIGH|MEDIUM|LOW",
  "ConfidenceScore": "0-100%",
  "Summary": {
    "Strengths": "point1\\npoint2",
    "Weaknesses": "point1\\npoint2",
    "Recommendation": "point1\\npoint2"
  },
  "ReportData": {
    "inferred_answers_used": { ...copy inferred answers... },
    "key_findings": ["short finding 1", "short finding 2"],
    "adaptability": {
      "can_be_adapted": true,
      "comments": "short evidence-based comment"
    }
  }
}

Rules:
- Keep ConfidenceScore clamped to 0-100%.
- One line per bullet item in Summary fields (newline-separated text).
- If a section has no points, return empty string "" for that field.
- Keep recommendations practical and specific to provided data.`;
};

export const buildReportSectionsFillPrompt = ({
  wizardData,
  analysisData = {},
  observations = [],
}: {
  wizardData: Record<string, any>;
  analysisData?: Record<string, any>;
  observations?: Array<Record<string, any>>;
}): string => {
  const observationText =
    observations.length > 0
      ? observations
          .map(
            (obs) =>
              `- [${obs.category || "General"}] ${obs.content || ""} (${obs.authorName || "Unknown"})`,
          )
          .join("\n")
      : "- None";

  return `Role: You are an expert OT housing assessment report assistant.

Task:
- Use wizard answers + analyzed data to complete report sections C-F with deterministic, machine-readable values.
- Follow branching and STOP NOW logic strictly.
- Use this source precedence whenever multiple sources conflict:
  1) floor plan inference
  2) photo inference
  3) user input fallback
- All required measurement fields must be numeric best-guess values in cm. Do NOT return null for required measurements.

Input Wizard Data:
${JSON.stringify(wizardData, null, 2)}

Input Analysis Data:
${JSON.stringify(analysisData, null, 2)}

Professional Observations:
${observationText}

Rules:
1) Section C major adaptations:
   - through_floor_lift_present
   - step_lift_present
   - platform_stair_lift_present
   - level_access_shower_present
   - ceiling_track_hoist_present
   - stair_lift_present
   - through_floor_lift_internal_width_cm
   - through_floor_lift_internal_depth_cm
2) Section D part branching:
   - communal_front_door_present -> if false, communal-front-door detail fields should be null.
   - communal_lift_present -> if false, communal-lift detail fields should be null.
   - property_front_door_present -> if false, property-front-door detail fields should be null.
3) Section E matrices must include explicit booleans for each facility on access/above/below level.
4) Section E STOP NOW checks:
   - stop_if_internal_steps (internal steps count > 0, not including stairs)
   - stop_if_stair_width (straight <= 69.9 OR curved <= 74.9)
   - stop_if_no_clearance_no_exit (clearance < 70 AND no second exit to street)
5) Section F:
   - complete kitchen, separate toilet, bathroom, door widths, parking, proximity.
6) Threshold bands must use only:
   - "10cm or above"
   - "Under 10cm and above 1.5cm"
   - "0 - 1.5cm"
7) Bedroom door width outputs should be consistent with bedroom_count from provided inputs.
8) Known hazards:
   - Merge known hazards from wizard/analysis/observations into one short comma-separated string.
9) Required measurements that must always be numbers:
   - communal_front_door_threshold_height_cm
   - communal_front_door_opening_width_cm
   - communal_lift_internal_width_cm
   - communal_lift_internal_depth_cm
   - communal_lift_door_opening_width_cm
   - property_front_door_opening_width_cm
   - internal_stair_width_cm
   - stair_clearance_bottom_cm
   - second_exit_door_opening_width_cm
   - wheelchair_storage_estimate_length_cm
   - wheelchair_storage_estimate_width_cm
   - separate_toilet_dimensions_width_cm
   - separate_toilet_dimensions_depth_cm
   - separate_toilet_lateral_space_cm
   - bathroom_dimensions_width_cm
   - bathroom_dimensions_depth_cm
   - bathroom_toilet_lateral_space_cm
   - door_opening_width_living_room_cm
   - door_opening_width_kitchen_cm
   - door_opening_width_bed_1_cm
   - door_opening_width_bed_2_cm
   - door_opening_width_bed_3_cm
   - door_opening_width_bathroom_cm
   - door_opening_width_separate_toilet_cm
   - door_opening_width_balcony_cm
10) If STOP NOW is true:
   - set stop_assessment_flag=true
   - set stop_reason with exact trigger
   - still return all required fields (using best-guess numbers where needed)

Return JSON only in this shape:
{
  "section_fill": {
    "property_type": "House|Bungalow|Flat|Maisonette|",
    "entrance_level": "Ground Floor|Upper Floor|Basement|",
    "bedroom_count": 0,

    "through_floor_lift_present": false,
    "step_lift_present": false,
    "platform_stair_lift_present": false,
    "level_access_shower_present": false,
    "ceiling_track_hoist_present": false,
    "stair_lift_present": false,
    "through_floor_lift_internal_width_cm": 0,
    "through_floor_lift_internal_depth_cm": 0,

    "communal_front_door_present": false,
    "communal_front_door_steps_count": 0,
    "communal_front_door_threshold_height_cm": 0,
    "communal_front_door_opening_width_cm": 0,

    "communal_lift_present": false,
    "communal_lift_internal_width_cm": 0,
    "communal_lift_internal_depth_cm": 0,
    "communal_lift_door_opening_width_cm": 0,
    "lifts_servicing_dwelling_count": 0,

    "property_front_door_present": false,
    "property_front_door_steps_count": 0,
    "property_front_door_threshold_band": "",
    "property_front_door_opening_width_cm": 0,

    "facilities_access_level": {},
    "facilities_above_level": {},
    "facilities_below_level": {},

    "internal_steps_count": 0,
    "has_stairs": false,
    "stair_type": "",
    "internal_stair_width_cm": 0,
    "stair_clearance_bottom_cm": 0,

    "second_exit_present": false,
    "second_exit_access_to_street": false,
    "second_exit_steps_count": 0,
    "second_exit_threshold_band": "",
    "second_exit_door_opening_width_cm": 0,

    "private_garden_present": false,
    "balcony_present": false,
    "garden_steps_count": 0,
    "balcony_steps_count": 0,

    "wheelchair_storage_present": false,
    "wheelchair_storage_estimate_length_cm": 0,
    "wheelchair_storage_estimate_width_cm": 0,
    "wheelchair_storage_charging_present": false,

    "turning_circle": false,
    "turning_circle_170x140": false,
    "accessible_layout": false,
    "separate_from_living": false,

    "has_separate_toilet": false,
    "separate_toilet_dimensions_width_cm": 0,
    "separate_toilet_dimensions_depth_cm": 0,
    "separate_toilet_count": 0,
    "separate_toilet_lateral_space_cm": 0,

    "bathroom_turning_space_150": false,
    "bathroom_dimensions_width_cm": 0,
    "bathroom_dimensions_depth_cm": 0,
    "bathroom_la_shower_and_bath": false,
    "bathroom_bath_only": false,
    "bathroom_next_to_separate_toilet": false,
    "bathroom_toilet_lateral_space_cm": 0,

    "door_opening_width_living_room_cm": 0,
    "door_opening_width_kitchen_cm": 0,
    "door_opening_width_bed_1_cm": 0,
    "door_opening_width_bed_2_cm": 0,
    "door_opening_width_bed_3_cm": 0,
    "door_opening_width_bathroom_cm": 0,
    "door_opening_width_separate_toilet_cm": 0,
    "door_opening_width_balcony_cm": 0,

    "parking_next_to_property": false,
    "parking_covered": false,
    "parking_designated": false,

    "proximity_shops_lt_100m": false,
    "proximity_transport_lt_100m": false,
    "transport_types": []
  },
  "stop_flags": {
    "stop_if_no_lift_or_ramp": false,
    "stop_if_internal_steps": false,
    "stop_if_stair_width": false,
    "stop_if_no_clearance_no_exit": false,
    "stop_assessment_flag": false,
    "stop_reason": ""
  },
  "known_hazards": "comma separated",
  "Confidence": "HIGH|MEDIUM|LOW",
  "ConfidenceScore": "0-100%",
  "Summary": {
    "Strengths": "point1\\npoint2",
    "Weaknesses": "point1\\npoint2",
    "Recommendation": "point1\\npoint2"
  },
  "ReportData": {
    "key_findings": ["short finding 1", "short finding 2"]
  }
}`;
};
