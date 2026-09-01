import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { callEngineJson, redactVendor } from "@/lib/engine/engineClient";
import { ENGINE_MODELS } from "@/lib/engine/models";
import { loadReportData } from "@/lib/reports/loadReportData";
import {
  buildReportFeedbackPrompt,
  REPORT_FEEDBACK_SCHEMA,
  type ReportFeedback,
} from "@/lib/reports/feedbackPrompt";

const ENGINE_API_KEY = process.env.ENGINE_API_KEY;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Narrative feedback on an organisation's assessment report.
 *
 * The figures are recomputed here from the caller's own visible cases rather than taken
 * from the request body: the browser sends only the date range, so the commentary is
 * always about data this user is entitled to see, and cannot be steered by posting numbers
 * that were never in the database.
 */
export async function POST(request: NextRequest) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  if (!ENGINE_API_KEY) {
    return NextResponse.json(
      { error: "Report feedback requires ENGINE_API_KEY to be configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { from?: string; to?: string };
  const from = body.from;
  const to = body.to;
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return NextResponse.json({ error: "A from and to date (YYYY-MM-DD) are required." }, { status: 400 });
  }

  const db = asLooseClient(await createClient());
  const data = await loadReportData(db, context, { from, to });
  if (data.summary.total === 0) {
    return NextResponse.json(
      { error: "There are no assessments in this period to comment on." },
      { status: 422 },
    );
  }

  const prompt = buildReportFeedbackPrompt({
    organisationName: context.organisationName,
    range: { from, to },
    summary: data.summary,
    bands: data.bands.map((band) => ({
      label: band.band ? `Band ${band.band} — ${band.label}` : band.label,
      count: band.count,
    })),
    cost: data.cost,
    improvements: data.improvements,
    activity: data.activity,
  });

  try {
    const { payload } = await callEngineJson<ReportFeedback>({
      apiKey: ENGINE_API_KEY,
      model: ENGINE_MODELS.reportInsight,
      parts: [{ text: prompt }],
      maxOutputTokens: 2048,
      thinkingLevel: "medium",
      responseSchema: REPORT_FEEDBACK_SCHEMA as unknown as Record<string, unknown>,
    });
    return NextResponse.json({
      feedback: {
        headline: String(payload.headline ?? "").trim(),
        observations: toStrings(payload.observations),
        recommendations: toStrings(payload.recommendations),
        watchOuts: toStrings(payload.watchOuts),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? redactVendor(error.message) : "Feedback could not be generated.";
    console.error("[reports/feedback]", message);
    return NextResponse.json({ error: `Feedback could not be generated: ${message}` }, { status: 502 });
  }
}

/** The schema asks for arrays of strings; a model that returns something else is trimmed away. */
function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 6);
}
