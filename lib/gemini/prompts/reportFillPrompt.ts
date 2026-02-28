export const buildReportFillPrompt = ({
  wizardData,
  analysisData = {},
  observations = [],
}: {
  wizardData: Record<string, unknown>;
  analysisData?: Record<string, unknown>;
  observations?: Array<Record<string, unknown>>;
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
