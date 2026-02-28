export const buildFloorImagesPrompt = (
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
