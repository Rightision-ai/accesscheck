import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await req.json().catch(() => null);
  return NextResponse.json(
    {
      error:
        "Rescore endpoint is deprecated. Use /api/gemini/analyze with analysis-only confidence report prompts.",
    },
    { status: 410 },
  );
}
