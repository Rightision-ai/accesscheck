import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { loadRateCardForOrganisation } from "@/lib/rate-cards/repository";

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Download rates as CSV.
 *
 * Without `?version=`: the **effective merged card** — what actually prices plans today —
 * with a `source` column so it is obvious which lines the organisation owns.
 *
 * With `?version=N`: the stored upload, byte for byte. That file is the audit artefact behind a
 * published version, so it is returned verbatim rather than re-serialised from the rows; a
 * round trip through Papa.unparse would silently reformat what someone may need to produce at
 * a DFG panel.
 */
export async function GET(request: NextRequest) {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const supabase = await createClient();
  const requestedVersion = request.nextUrl.searchParams.get("version");

  if (requestedVersion !== null) {
    const version = Number(requestedVersion);
    if (!Number.isInteger(version) || version < 1) {
      return NextResponse.json({ error: "version must be a positive integer" }, { status: 400 });
    }

    const { data } = await supabase
      .from("rate_cards")
      .select("version, source_csv, source_filename")
      .eq("organisation_id", context.organisationId)
      .eq("version", version)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "That version was not found." }, { status: 404 });
    }
    if (!data.source_csv) {
      return NextResponse.json(
        { error: "That version has no uploaded file to download." },
        { status: 404 },
      );
    }
    return csvResponse(
      data.source_csv,
      data.source_filename ?? `rate-card-v${data.version}.csv`,
    );
  }

  const card = await loadRateCardForOrganisation(supabase, context.organisationId);
  const csv = Papa.unparse(
    card.items.map((item) => ({
      work_item_code: item.workItemCode,
      description: item.description,
      rate_low_gbp: item.rateLowGbp,
      rate_expected_gbp: item.rateExpectedGbp,
      rate_high_gbp: item.rateHighGbp,
      duration_days_low: item.durationDaysLow,
      duration_days_expected: item.durationDaysExpected,
      duration_days_high: item.durationDaysHigh,
      source_label: item.sourceLabel,
      source:
        card.ownedCardId !== null && item.rateCardId === card.ownedCardId
          ? "organisation"
          : "national",
    })),
  );

  return csvResponse(csv, "accesscheck-rate-card-in-use.csv");
}
