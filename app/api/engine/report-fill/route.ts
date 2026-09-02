import { NextRequest, NextResponse } from "next/server";
import { buildReportFillPrompt } from "@/lib/engine/prompts/reportFillPrompt";
import { ENGINE_MODELS, engineUrl, jsonGenerationConfig } from "@/lib/engine/models";
import { parseEngineJson } from "@/lib/engine/json";

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const ENGINE_API_URL = engineUrl(ENGINE_MODELS.reportFill);

// The fill is the largest generation in the product — a ~100-field section_fill, the summary,
// the findings and the gaps list — and it thinks at "high" before writing any of it. Thinking
// tokens are charged against maxOutputTokens, so 8192 truncated real assessments mid-object.
const MAX_OUTPUT_TOKENS = 32768;

// Raised with the token budget: the request is only slow because we asked for a lot.
export const maxDuration = 120;

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
      // Includes responseMimeType: "application/json". Without it the model wraps the object in
      // a ```json fence, which every reader downstream then has to strip.
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
          `[report-fill] recovered a truncated response (finishReason=${finishReason ?? "unknown"})`,
        );
      }
      return NextResponse.json({ success: true, result, recovered, finishReason, rawText: aiText });
    }

    // No usable object. Previously this answered success: true with a null result, so the
    // wizard reported a generic failure and the reason never left the browser console.
    return NextResponse.json({
      success: false,
      result: null,
      finishReason,
      rawText: aiText,
      parseError:
        finishReason === "MAX_TOKENS"
          ? "The report was cut off before it finished generating."
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
