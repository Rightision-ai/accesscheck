import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

export const maxDuration = 60; // Set max duration for Vercel/Next.js

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const { prompt, images } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    console.log(
      `[Gemini API] Processing request with ${images?.length || 0} images...`,
    );

    const parts: any[] = [{ text: prompt }];

    // Add images if provided
    if (images && images.length > 0) {
      for (const img of images) {
        parts.push({
          inline_data: {
            mime_type: img.mime_type,
            data: img.data,
          },
        });
      }
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    };

    // Helper for retry logic
    const fetchWithRetry = async (
      url: string,
      options: RequestInit,
      retries = 3,
    ) => {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
          const errorDetails = await response.text();
          console.warn(
            `[Gemini API] 429 Too Many Requests. Details: ${errorDetails}`,
          );
          const waitTime = Math.pow(2, i) * 1000 + Math.random() * 500;
          console.warn(`[Gemini API] Retrying in ${Math.round(waitTime)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return response;
      }
      throw new Error("Max retries exceeded for Gemini API");
    };

    console.log("[Gemini API] Sending request to analyze API...");
    // Call Gemini API with verification
    const response = await fetchWithRetry(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );
    console.log("[Gemini API] Response received from analyze API");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini API] Error:", response.status, errorText);

      // IF QUOTA EXCEEDED (429) OR OTHER API ISSUES, RETURN MOCK DATA INSTEAD OF 500
      if (
        response.status === 429 ||
        response.status === 400 ||
        response.status === 404
      ) {
        console.warn(
          "[Gemini API] Returning SMARTER MOCK DATA due to API limitations...",
        );

        // Mock data logic from server.js
        if (prompt.toLowerCase().includes("floor plan")) {
          const mockFloorPlanResult = {
            entrance_level: { value: "GROUND", confidence: 0.95 },
            lift: { detected: false, confidence: 0.9 },
            internal_stairs: { detected: true, confidence: 0.98 },
            bedroom_count: { value: 3, confidence: 0.92 },
            external_access: {
              garden_present: true,
              balcony_present: false,
              parking_present: true,
              confidence: 0.85,
            },
            second_exit: { detected: true, confidence: 0.88 },
          };
          return NextResponse.json({
            success: true,
            result: mockFloorPlanResult,
            isMock: true,
            note: "Simulated floor plan analysis.",
          });
        }

        const mockAhr = {
          meta_data: {
            schema_version: "1.2.0",
            property_address: "123 Survey Path, London",
            uprn: "100023456789",
            inspection_date: new Date().toISOString(),
            overall_grade: "B",
            access_category: "Category 2: Accessible and adaptable dwelling",
          },
          occupancy: {
            number_of_bedrooms: 3,
            number_of_bed_spaces: 5,
          },
          eligibility_checks: {
            entrance_level: "GROUND",
            lifts_servicing_dwelling_count: 0,
            special_equipment: {
              through_floor_lift: false,
              ceiling_track_hoist: false,
              step_lift: false,
              stair_lift: true,
            },
            level_access_shower_present: true,
            stop_triggered: false,
          },
          external_access: {
            communal_front_door: {
              width_cm: {
                value: 85,
                confidence: 0.9,
                scaling_source: "user_ref",
              },
              steps_count: 0,
              threshold_height_cm: {
                value: 1.2,
                confidence: 0.85,
                scaling_source: "photos",
              },
              is_compliant: true,
            },
            property_front_door: {
              width_cm: {
                value: 82.5,
                confidence: 0.95,
                scaling_source: "user_ref",
              },
              steps_count: 1,
              threshold_height_cm: {
                value: 1.8,
                confidence: 0.8,
                scaling_source: "photos",
              },
              is_compliant: false,
            },
            ramps: {
              communal: {
                present: true,
                gradient_ratio: "1:15",
                width_cm: { value: 120 },
                has_handrails: true,
                adequate_platform: true,
              },
              property_specific: { present: false },
            },
            lift_details: { present: false },
          },
          vertical_circulation: {
            internal_stairs: {
              present: true,
              step_count: 14,
              min_width_cm: { value: 80 },
              type: "STRAIGHT",
              handrails: "BOTH_SIDES",
              clear_space_bottom_70cm: true,
            },
          },
          facility_distribution: {
            access_level_has: ["kitchen", "living_room", "separate_wc"],
            above_access_level_has: ["bed1", "bed2", "bathroom"],
            below_access_level_has: [],
          },
          internal_doors: {
            living_room: { width_cm: 80, compliant: true },
            kitchen: { width_cm: 77.5, compliant: true },
            bedroom_1: { width_cm: 77.5, compliant: true },
            bathroom: { width_cm: 75, compliant: false },
          },
          internal_circulation: {
            hallway: {
              min_width_cm: { value: 105 },
              radiators_intruding: true,
              approach_type: "HEAD_ON",
            },
            wheelchair_storage: {
              present: true,
              dimensions_cm: { length: 120, width: 80 },
              charging_point: true,
            },
          },
          room_analysis: {
            bathroom: {
              dimensions_cm: { area_m2: 5.2 },
              type: "LEVEL_ACCESS_SHOWER",
              combined_with_wc: true,
              turning_circle: { fits_150cm: true, clearance_pct: 100 },
              toilet_transfer_space: {
                lateral_space_cm: { value: 75 },
                side: "LEFT",
                compliant_75cm: true,
              },
            },
            kitchen: {
              turning_circle: {
                fits_150cm: false,
                clearance_pct: 85,
                limiting_factors: ["Radiator"],
              },
              accessible_units: false,
            },
          },
          adaptability_assessment: {
            spatial_feasibility: {
              is_feasible: true,
              score: 0.8,
              reasoning: "Adequate bathroom footprint.",
            },
            structural_feasibility: {
              is_feasible: true,
              score: 0.7,
              reasoning: "Stud walls allow reconfiguration.",
            },
            overall_verdict: "MODERATE_POTENTIAL",
          },
          risk_register: [
            {
              code: "DOOR_WIDTH_BATH",
              severity: "MEDIUM",
              description:
                "Bathroom door width 75cm is below preferred 77.5cm.",
              action: "Enlarge door frame if feasible.",
            },
          ],
          context_amenities: {
            parking: { designated: true, type: "OPEN_BAY" },
            proximity: { shops_lt_100m: true, transport_lt_100m: false },
            second_exit: { present: true, steps: 0, ramped: true },
          },
        };

        return NextResponse.json({
          success: true,
          result: mockAhr,
          isMock: true,
          note: "This is a high-fidelity simulated analysis for preview purposes.",
        });
      }

      return NextResponse.json(
        {
          error: "Gemini API Error",
          details: errorText,
          code: response.status,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("[Gemini API] Response received successfully");

    // Try to parse JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          success: true,
          result: parsedResult,
          rawText: aiText,
        });
      } catch (parseError) {
        return NextResponse.json({
          success: true,
          result: null,
          rawText: aiText,
          parseError: "Could not parse JSON from response",
        });
      }
    }

    return NextResponse.json({
      success: true,
      result: null,
      rawText: aiText,
    });
  } catch (error: any) {
    console.error("[Gemini API] Server Error:", error.message);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
