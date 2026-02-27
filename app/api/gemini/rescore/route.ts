import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const { wizardData, inferredAnswers, observations } = await req.json();

    // Build observations section for prompt
    let observationsSection = "";
    if (observations && observations.length > 0) {
      observationsSection = "\n\nPROFESSIONAL OBSERVATIONS FROM OT:\n";
      observations.forEach((obs: any) => {
        observationsSection += `- [${obs.category}] ${obs.content} (by ${obs.authorName}, ${new Date(obs.createdAt).toLocaleDateString("en-GB")})\n`;
      });
      observationsSection +=
        "\nIMPORTANT: Consider these professional observations when calculating the score. Negative observations (Safety Hazards, Accessibility Issues) should reduce the score appropriately.\n";
    }

    const scoringPrompt = `You are an OT accessibility scorer. Calculate the accessibility score with these inputs:

MANDATORY INPUTS (from user):
- Q1 (Mobility): ${wizardData.mobility}
- Q6 (Bathing): ${wizardData.bathing}
- Q10 (Toileting): ${wizardData.toileting}

INFERRED/OVERRIDDEN VALUES:
- Q2 (Stairs): ${inferredAnswers.Q2_Stairs}
- Q3 (Entrance): ${inferredAnswers.Q3_Entrance}
- Q4 (Garden): ${inferredAnswers.Q4_Garden}
- Q5 (Door Width): ${inferredAnswers.Q5_DoorWidth}
- Q7 (Bathroom Door): ${inferredAnswers.Q7_BathroomDoor}
- Q8 (Shower Type): ${inferredAnswers.Q8_ShowerType}
- Q9 (Shower Size): ${inferredAnswers.Q9_ShowerSize}
- Q11 (Wash/Dry Toilet): ${inferredAnswers.Q11_WashDryToilet}
${observationsSection}
SCORING COEFFICIENTS:
Base Score: 0.45
Q1: Use a one-handed aid=0.00, Unable to leave bed=-0.32, Use a two-handed aid=-0.14, Personal assistance needed=-0.18, Independent wheelchair user=-0.38, Wheelchair with assistance=-0.34
Q2: Straight stairs one handrail=0.00, Straight stairs both handrails=0.06, Staircase that turns=-0.09, All on one level=0.28
Q3: Few steps=0.00, Steady slope=0.04, Steep slope=-0.06, No steps flat=0.12
Q4: Steps to garden=0.00, Steep slope=-0.05, Steady slope=0.03, No steps flat=0.09
Q5: Less than 76 cm=0.00, More than 76 cm=0.14
Q6: Bathe at sink need help=0.00, Need help at all times=-0.20, Need help to bathe=-0.12, Use device=0.08, Sometimes need help=0.04, Can bathe myself=0.17
Q7: Less than 73 cm=0.00, 73-90 cm=0.09, Over 90 cm=0.20
Q8: Shower no steps=0.00, Shower cubicle with step=-0.08, Shower over bath=-0.14, Bath only no shower=-0.22
Q9: <900x900 mm=0.00, 900x900-1200x1200 mm=0.12, >1200x1200 mm=0.23
Q10: Need help at all times=0.00, Need help with hygiene=0.06, Sometimes need help=0.14, Use independently=0.28
Q11: No wash/dry toilet=0.00, Have wash/dry toilet=0.17

Apply adaptive weighting (wheelchair=1.3x for Q5,Q7,Q8,Q9,Q10; two-handed=1.2x for Q2,Q3,Q4).
Apply penalty rules for high-risk combinations.

CRITICAL: The AccessibilityScore MUST NEVER exceed 100. Always clamp the final percentage to [0, 100]. If any calculation yields >100, use exactly 100.0.

SUMMARY: Provide Strengths, Weaknesses, and Recommendation as bullet-point lists: one point per line (use newline \\n between points). If there is nothing to say for a category, use empty string "" for that field. Do not write "None" or "N/A"—leave empty and the UI will handle it.

RESPOND IN EXACT JSON:
{"AccessibilityScore": "XX.X%", "Grade": "X", "Summary": {"Strengths": "point1\\npoint2", "Weaknesses": "point1", "Recommendation": "point1\\npoint2"}}`;

    const requestBody = {
      contents: [{ parts: [{ text: scoringPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192, // Increased from 1024 to accommodate reasoning models
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
          const waitTime = Math.pow(2, i) * 1000 + Math.random() * 500;
          console.warn(
            `[Rescore API] 429 Too Many Requests. Retrying in ${Math.round(waitTime)}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return response;
      }
      throw new Error("Max retries exceeded for Gemini API");
    };

    console.log("[Rescore API] Sending request to Gemini...");
    const response = await fetchWithRetry(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );
    console.log("[Rescore API] Response received from Gemini");

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log("[Rescore API] Raw AI Response:", JSON.stringify(data, null, 2));

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[Rescore API] AI Text Content:", aiText);

    // Try multiple cleanup strategies
    let jsonString = aiText;
    
    // 1. Try to find JSON block in markdown
    const jsonBlockMatch = aiText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1];
    } else {
        // 2. Try to find first { and last }
        const firstBrace = aiText.indexOf('{');
        const lastBrace = aiText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = aiText.substring(firstBrace, lastBrace + 1);
        }
    }

    const clampScore = (scoreStr: string | undefined): string => {
        if (!scoreStr || typeof scoreStr !== 'string') return scoreStr ?? '0%';
        const num = parseFloat(scoreStr.replace(/%/g, ''));
        if (isNaN(num)) return scoreStr;
        const clamped = Math.max(0, Math.min(100, num));
        return `${clamped.toFixed(1)}%`;
    };

    try {
        const parsedResult = JSON.parse(jsonString);
        if (parsedResult.AccessibilityScore) {
            parsedResult.AccessibilityScore = clampScore(parsedResult.AccessibilityScore);
        }
        return NextResponse.json({ success: true, result: parsedResult });
    } catch (e) {
        console.error("[Rescore API] JSON Parse Error:", e);
        // Fallback: Return raw text wrapped in structure if parse fails but we have text
        if (aiText) {
             console.warn("[Rescore API] Falling back to manual text extraction");
             // Attempt manual extraction if JSON fails (simple regex for key fields)
             const scoreMatch = aiText.match(/"AccessibilityScore":\s*"([^"]+)"/);
             const gradeMatch = aiText.match(/"Grade":\s*"([^"]+)"/);
             
             if (scoreMatch || gradeMatch) {
                 const rawScore = scoreMatch ? scoreMatch[1] : "N/A";
                 return NextResponse.json({ 
                    success: true, 
                    result: {
                        AccessibilityScore: rawScore !== "N/A" ? clampScore(rawScore) : "N/A",
                        Grade: gradeMatch ? gradeMatch[1] : "N/A",
                        Summary: { Strengths: "See full text", Weaknesses: "See full text", Recommendation: aiText }
                    }
                 });
             }
        }
    }

    return NextResponse.json(
      { error: "Could not parse AI response", raw: aiText },
      { status: 500 },
    );
  } catch (error: any) {
    console.error("[Rescore API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
