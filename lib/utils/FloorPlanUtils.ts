export interface FloorPlanAnalysisResult {
  /** AI validation: true if image is a floor plan, false if random photo/unrelated document */
  is_floor_plan?: boolean;
  entrance_level: {
    value: "GROUND" | "UPPER" | "BASEMENT";
    confidence: number;
  };
  lift: {
    detected: boolean;
    confidence: number;
  };
  internal_stairs: {
    detected: boolean;
    confidence: number;
  };
  bedroom_count: {
    value: number;
    confidence: number;
  };
  external_access: {
    garden_present: boolean;
    balcony_present: boolean;
    parking_present: boolean;
    confidence: number;
  };
  second_exit: {
    detected: boolean;
    confidence: number;
  };
  floor_level_number: number | null;
  stair_geometry:
    | "Straight"
    | "Quarter Turn"
    | "Half Turn"
    | "Spiral"
    | "Winding"
    | null;
  communal: {
    communal_door_present: boolean;
    communal_lift_present: boolean;
    communal_lift_count: 0 | 1 | 2 | 3;
  };
  facilities_per_floor: {
    access_level: string[];
    above: string[];
    below: string[];
  };
  section_measurements?: {
    communal_front_door_steps_count?: number | null;
    communal_front_door_threshold_height_cm?: number | null;
    communal_front_door_opening_width_cm?: number | null;
    property_front_door_steps_count?: number | null;
    property_front_door_threshold_height_cm?: number | null;
    property_front_door_opening_width_cm?: number | null;
    communal_lift_internal_width_cm?: number | null;
    communal_lift_internal_depth_cm?: number | null;
    communal_lift_door_opening_width_cm?: number | null;
    internal_steps_count?: number | null;
    internal_stair_width_cm?: number | null;
    internal_step_height_cm?: number | null;
    second_exit_steps_count?: number | null;
    second_exit_door_opening_width_cm?: number | null;
    hallway_head_on_width_cm?: number | null;
    hallway_turn_width_cm?: number | null;
    door_opening_width_living_room_cm?: number | null;
    door_opening_width_kitchen_cm?: number | null;
    door_opening_width_bed_1_cm?: number | null;
    door_opening_width_bed_2_cm?: number | null;
    door_opening_width_bed_3_cm?: number | null;
    door_opening_width_separate_toilet_cm?: number | null;
    door_opening_width_bathroom_cm?: number | null;
    door_opening_width_balcony_cm?: number | null;
  };
  adaptability?: {
    can_be_adapted?: boolean;
    comments?: string;
  };
  annotations?: Array<{
    type: "door" | "stairs" | "ramp" | "lift" | "second_exit";
    bbox: [number, number, number, number]; // ymin, xmin, ymax, xmax (normalized 0-1000)
    label?: string;
  }>;
}

import { convertHeicToJpegIfNeeded } from "./imageUtils";

export const analyzeFloorPlan = async (
  file: File,
): Promise<FloorPlanAnalysisResult | null> => {
  try {
    file = await convertHeicToJpegIfNeeded(file);

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        // e.g. "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });

    const requestBody = {
      images: [
        {
          mime_type: file.type,
          data: base64Data,
        },
      ],
    };

    console.log("Sending floor plan for analysis...");
    const response = await fetch("/api/gemini/floor-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Floor plan analysis response received");

    if (!response.ok) {
      console.error("Gemini Analysis Failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    console.log("Floor plan analysis data:", data);

    let cleanJson = data.result;

    if (typeof cleanJson === "object") {
      const result = cleanJson as FloorPlanAnalysisResult;
      if (result.is_floor_plan === false) return null;
      return result;
    }

    if (typeof cleanJson === "string") {
      if (cleanJson.includes("```json")) {
        cleanJson = cleanJson.replace(/```json\n?/, "").replace(/```/, "");
      } else if (cleanJson.includes("```")) {
        cleanJson = cleanJson.replace(/```\n?/, "").replace(/```/, "");
      }
      const result = JSON.parse(cleanJson) as FloorPlanAnalysisResult;
      if (result.is_floor_plan === false) return null;
      return result;
    }

    return null;
  } catch (error) {
    console.error("Error analyzing floor plan:", error);
    return null;
  }
};
