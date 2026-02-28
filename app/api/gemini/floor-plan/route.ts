import { NextRequest, NextResponse } from "next/server";
import { buildFloorPlanPrompt } from "@/lib/gemini/prompts/floorPlanPrompt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
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
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
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
