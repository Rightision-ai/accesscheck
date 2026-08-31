import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { isApiError, requireApiContext } from "@/lib/api/auth";
import { loadRateCardForOrganisation } from "@/lib/rate-cards/repository";

/**
 * The upload template, prefilled with the rates in force today.
 *
 * Prefilled rather than blank so an officer edits the two or three lines they have a framework
 * price for and leaves the rest — which is exactly the semantics of the merge. `description` is
 * included for legibility and ignored on the way back in.
 */
export async function GET() {
  const context = await requireApiContext("admin");
  if (isApiError(context)) return context;

  const supabase = await createClient();
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
    })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="accesscheck-rate-card-template.csv"',
    },
  });
}
