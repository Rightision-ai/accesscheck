import { NextRequest, NextResponse } from "next/server";
import { buildFloorPlanPrompt } from "@/lib/engine/prompts/floorPlanPrompt";
import { ENGINE_MODELS, engineUrl, jsonGenerationConfig } from "@/lib/engine/models";
import { parseEngineJson } from "@/lib/engine/json";

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const ENGINE_API_URL = engineUrl(ENGINE_MODELS.floorPlan);

// Thinking tokens are charged against maxOutputTokens, so at "high" the old 8192 left little
// room for the answer itself and truncated mid-object on rich inputs.
const MAX_OUTPUT_TOKENS = 16384;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!ENGINE_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const { images } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 },
      );
    }

    const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> =
      [{ text: buildFloorPlanPrompt() }];

    for (const img of images) {
      parts.push({
        inline_data: {
          mime_type: img.mime_type,
          data: img.data,
        },
      });
    }

    const requestBody = {
      contents: [{ parts }],
      // Includes responseMimeType: "application/json", so the model returns a bare object
      // instead of a ```json fence every reader downstream has to strip.
      generationConfig: jsonGenerationConfig({
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingLevel: "high",
      }),
    };

    const response = await fetch(`${ENGINE_API_URL}?key=${ENGINE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Analysis service error",
          details: errorText,
          code: response.status,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // MAX_TOKENS is the difference between "the model had nothing to say" and "we cut it off",
    // so it is reported rather than left for someone to infer from a half-written object.
    const finishReason: string | undefined = data.candidates?.[0]?.finishReason;
    const { result, recovered } = parseEngineJson(aiText);

    if (result) {
      if (recovered) {
        console.warn(
          `[floor-plan] recovered a truncated response (finishReason=${finishReason ?? "unknown"})`,
        );
      }
      return NextResponse.json({ success: true, result, recovered, finishReason, rawText: aiText });
    }

    return NextResponse.json({
      success: false,
      result: null,
      finishReason,
      rawText: aiText,
      parseError:
        finishReason === "MAX_TOKENS"
          ? "The response was cut off before it finished generating."
          : "Could not parse JSON from response",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message,
      },
      { status: 500 },
    );
  }
}
