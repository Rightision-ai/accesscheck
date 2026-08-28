import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { buildAssessmentSummary, buildWeeklyTrend, type AssessmentAnalyticsRow } from "@/lib/assessments/analytics";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const context = await requireApiContext();
  if (isApiError(context)) return context;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const format = request.nextUrl.searchParams.get("format");
  const db = asLooseClient(await createClient());
  let query = db
    .from("surveys")
    .select("id,created_at,updated_at,completed_at,status,assessment_readiness,assessment_completion_percent,overall_grade,street,postcode,inspector_name")
    .eq("organisation_id", context.organisationId)
    .order("created_at", { ascending: false });
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  const result = await query;
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  const rows = (result.data ?? []) as Array<AssessmentAnalyticsRow & Record<string, unknown>>;
  if (format === "csv") {
    const headers = ["ID", "Address", "Postcode", "Inspector", "Status", "Readiness", "Completion %", "Created", "Completed", "Accessibility band"];
    const lines = rows.map((row) => [
      row.id,
      row.street,
      row.postcode,
      row.inspector_name,
      row.status,
      row.assessment_readiness,
      row.assessment_completion_percent,
      row.created_at,
      row.completed_at,
      row.overall_grade,
    ].map(csvCell).join(","));
    return new NextResponse([headers.map(csvCell).join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="assessment-report.csv"',
      },
    });
  }

  const gradeDistribution = rows.reduce<Record<string, number>>((totals, row) => {
    const grade = row.overall_grade || "Not recorded";
    totals[grade] = (totals[grade] ?? 0) + 1;
    return totals;
  }, {});
  return NextResponse.json({
    summary: buildAssessmentSummary(rows),
    weeklyTrend: buildWeeklyTrend(rows),
    gradeDistribution,
    assessments: rows,
  });
}
