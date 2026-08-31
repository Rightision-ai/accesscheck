import { NextRequest, NextResponse } from "next/server";
import { buildReportFillPrompt } from "@/lib/engine/prompts/reportFillPrompt";
import { ENGINE_MODELS, engineUrl, thinkingConfig } from "@/lib/engine/models";

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const ENGINE_API_URL = engineUrl(ENGINE_MODELS.reportFill);

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!ENGINE_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const { prompt, wizardData, analysisData, observations } = await req.json();
    const finalPrompt =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt
        : buildReportFillPrompt({
            wizardData: wizardData ?? {},
            analysisData: analysisData ?? {},
            observations: observations ?? [],
          });

    if (!finalPrompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const requestBody = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: {
        // No temperature override: Gemini 3 degrades when it is lowered.
        // Thinking depth is nested; a flat `thinking_level` here is a 400.
        ...thinkingConfig("high"),
        maxOutputTokens: 8192,
      },
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
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          success: true,
          result: parsedResult,
          rawText: aiText,
        });
      } catch {
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
