export const buildFloorPlanPrompt = (): string => `
            STEP 0 (VALIDATION): First confirm this image is a floor plan or architectural drawing of a property (room layout, walls, doors, dimensions). If it is a random photo, selfie, unrelated document, or not a floor plan, set is_floor_plan: false and return the minimal structure with is_floor_plan: false. If it IS a floor plan, set is_floor_plan: true and proceed with the full analysis below.
            
            **1. Deep Structural Analysis:**
            - **Entrance Level**: Identify the main entrance floor (GROUND/UPPER/BASEMENT).
            - **Floor Level Number**: If entrance is UPPER, which floor number? (1 = first floor, 2 = second, etc.). Null if ground.
            - **Lifts**: Detect any 'Lift' or 'Elevator' symbols.
            - **Stairs**: Detect internal staircases. Identify geometry: Straight / Quarter Turn / Half Turn / Spiral / Winding.
            - **Bedrooms**: Count rooms labeled 'Bed', 'Bedroom', 'Master', 'Box Room'.
            - **Garden/Balcony**: Look for 'Garden', 'Balcony', 'Terrace', 'Patio' labels or outlines.
            - **Parking**: Look for 'Garage', 'Carport', 'Driveway'.
            - **Second Exit**: Look for a rear door or secondary exit leading outside.
            - **Communal Areas**: Does the plan show a shared communal entrance/lobby? Is there a communal lift? How many lifts?
            - **Facilities per floor**: List rooms for each floor (access_level, above, below).
            
            **2. Detailed Measurements & Features (READ-ONLY — DO NOT ESTIMATE):**
            - **Door Widths**: Only return a value if an explicit dimension annotation is present on the door (e.g. "800", "762 mm"). If no dimension text is visible on that door, return null. Do NOT guess from visual proportions.
            - **Ramps**: Only flag if a ramp symbol, ramp label, or hatched incline marking is explicitly drawn.
            - **Stair Details**: Count steps only if individual treads are drawn. Handrails only if annotated or shown as parallel lines along the stair.
            - **Thresholds**: Only flag a threshold step if one is explicitly drawn or labelled.
            - **Lift Internal Dimensions**: Only return values if dimension text is present inside the lift symbol. Otherwise null.
            - **Section E Facilities**: Infer room distribution per floor from drawn room labels only.
            - **Adaptability**: Narrate feasibility based on observed layout; do not invent dimensions to justify a verdict.

            **Rule:** Measurement fields without an explicit source annotation on the drawing MUST be null. The downstream pipeline (YOLOv8-seg + OCR + scale calibration) produces authoritative measurements; your role is to read labels, identify room types, and narrate — not to estimate.

            **3. Spatial Annotations (Bounding Boxes):**
            - Identify key accessibility features: Main Entrance Door, Internal Stairs, Ramps, Lifts, Second Exit.
            - Return bounding boxes in [ymin, xmin, ymax, xmax] format, normalized to 0-1000.

            RETURN JSON ONLY:
            {
              "is_floor_plan": boolean,
              "entrance_level": { "value": "GROUND" | "UPPER" | "BASEMENT", "confidence": 0.0-1.0 },
              "floor_level_number": number | null,
              "lift": { "detected": boolean, "confidence": 0.0-1.0 },
              "internal_stairs": { "detected": boolean, "confidence": 0.0-1.0 },
              "stair_geometry": "Straight" | "Quarter Turn" | "Half Turn" | "Spiral" | "Winding" | null,
              "bedroom_count": { "value": number, "confidence": 0.0-1.0 },
              "external_access": {
                "garden_present": boolean,
                "balcony_present": boolean,
                "parking_present": boolean,
                "confidence": 0.0-1.0
              },
              "second_exit": { "detected": boolean, "confidence": 0.0-1.0 },
              "communal": {
                "communal_door_present": boolean,
                "communal_lift_present": boolean,
                "communal_lift_count": 0 | 1 | 2 | 3
              },
              "facilities_per_floor": {
                "access_level": ["Living Room", "Kitchen", ...],
                "above": ["Bed 1", "Bed 2", ...],
                "below": []
              },
              "section_measurements": {
                "communal_front_door_steps_count": number | null,
                "communal_front_door_threshold_height_cm": number | null,
                "communal_front_door_opening_width_cm": number | null,
                "property_front_door_steps_count": number | null,
                "property_front_door_threshold_height_cm": number | null,
                "property_front_door_opening_width_cm": number | null,
                "communal_lift_internal_width_cm": number | null,
                "communal_lift_internal_depth_cm": number | null,
                "communal_lift_door_opening_width_cm": number | null,
                "internal_steps_count": number | null,
                "internal_stair_width_cm": number | null,
                "internal_step_height_cm": number | null,
                "second_exit_steps_count": number | null,
                "second_exit_door_opening_width_cm": number | null,
                "hallway_head_on_width_cm": number | null,
                "hallway_turn_width_cm": number | null,
                "door_opening_width_living_room_cm": number | null,
                "door_opening_width_kitchen_cm": number | null,
                "door_opening_width_bed_1_cm": number | null,
                "door_opening_width_bed_2_cm": number | null,
                "door_opening_width_bed_3_cm": number | null,
                "door_opening_width_separate_toilet_cm": number | null,
                "door_opening_width_bathroom_cm": number | null,
                "door_opening_width_balcony_cm": number | null
              },
              "adaptability": {
                "can_be_adapted": boolean,
                "comments": "string"
              },
              "annotations": [
                {
                  "type": "door" | "stairs" | "ramp" | "lift" | "second_exit",
                  "bbox": [ymin, xmin, ymax, xmax],
                  "label": "Main Entrance" // Optional description
                }
              ]
            }
        `;
