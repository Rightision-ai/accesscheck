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
}

export const analyzeFloorPlan = async (
  file: File,
): Promise<FloorPlanAnalysisResult | null> => {
  try {
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
            Analyze the floor plan image.
            1.  **Entrance Level**: Identify the main entrance floor (Ground/Upper).
            2.  **Lifts**: Detect any 'Lift' or 'Elevator' symbols.
            3.  **Stairs**: Detect internal staircases.
            4.  **Bedrooms**: Count rooms labeled 'Bed', 'Bedroom', 'Master', 'Box Room'.
            5.  **Garden/Balcony**: Look for 'Garden', 'Balcony', 'Terrace', 'Patio' labels or outlines.
            6.  **Parking**: Look for 'Garage', 'Carport', 'Driveway'.
            7.  **Second Exit**: Look for a rear door leading to outside.

            RETURN JSON ONLY:
            {
              "entrance_level": { "value": "GROUND" | "UPPER" | "BASEMENT", "confidence": 0.0-1.0 },
              "lift": { "detected": boolean, "confidence": 0.0-1.0 },
              "internal_stairs": { "detected": boolean, "confidence": 0.0-1.0 },
              "bedroom_count": { "value": number, "confidence": 0.0-1.0 },
              "external_access": {
                "garden_present": boolean,
                "balcony_present": boolean,
                "parking_present": boolean,
                "confidence": 0.0-1.0
              },
              "second_exit": { "detected": boolean, "confidence": 0.0-1.0 }
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
