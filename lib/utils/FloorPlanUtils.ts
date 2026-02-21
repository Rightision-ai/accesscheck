export interface FloorPlanAnalysisResult {
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
  stair_geometry: "Straight" | "Quarter Turn" | "Half Turn" | "Spiral" | "Winding" | null;
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
  annotations?: Array<{
    type: 'door' | 'stairs' | 'ramp' | 'lift' | 'second_exit';
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

    const prompt = `
            Analyze the floor plan image deeply and provide a structured JSON response.
            
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
            
            **2. Detailed Measurements & Features (Estimate/Read):**
            - **Door Widths**: Look for dimension lines on doors (e.g., '800', '762'). Estimate if not explicit.
            - **Ramps**: Check for ramp symbols or labels.
            - **Stair Details**: Count steps if visible. Check for handrails.
            - **Thresholds**: Any step at the entrance?

            **3. Spatial Annotations (Bounding Boxes):**
            - Identify key accessibility features: Main Entrance Door, Internal Stairs, Ramps, Lifts, Second Exit.
            - Return bounding boxes in [ymin, xmin, ymax, xmax] format, normalized to 0-1000.

            RETURN JSON ONLY:
            {
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
              "annotations": [
                {
                  "type": "door" | "stairs" | "ramp" | "lift" | "second_exit",
                  "bbox": [ymin, xmin, ymax, xmax],
                  "label": "Main Entrance" // Optional description
                }
              ]
            }
        `;

    const requestBody = {
      prompt,
      images: [
        {
          mime_type: file.type,
          data: base64Data,
        },
      ],
    };

    console.log("Sending floor plan for analysis...");
    const response = await fetch("/api/gemini/analyze", {
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
      return cleanJson as FloorPlanAnalysisResult;
    }

    if (cleanJson.includes("```json")) {
      cleanJson = cleanJson.replace(/```json\n?/, "").replace(/```/, "");
    } else if (cleanJson.includes("```")) {
      cleanJson = cleanJson.replace(/```\n?/, "").replace(/```/, "");
    }

    return JSON.parse(cleanJson) as FloorPlanAnalysisResult;
  } catch (error) {
    console.error("Error analyzing floor plan:", error);
    return null;
  }
};
