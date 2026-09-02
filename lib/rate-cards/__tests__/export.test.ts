import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { accesscheckEstimationCard } from "@/lib/rate-cards/accesscheckEstimation";
import {
  parseRateCardCsv,
  resolveAgainstNational,
  toCommitPayload,
} from "@/lib/rate-cards/csv";

/**
 * Download → edit → upload has to round-trip.
 *
 * The export route and the template route both serialise with `Papa.unparse`, and the officer
 * edits the result in Excel and posts it straight back. If the two ends disagree about column
 * names or number formatting, the first thing anyone tries fails — so this test serialises the
 * same way the routes do and feeds it through the real parser.
 */
function unparseLikeTheExportRoute(card = accesscheckEstimationCard()) {
  return Papa.unparse(
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
      source: "accesscheck",
    })),
  );
}

describe("rate card export", () => {
  const national = accesscheckEstimationCard();

  it("round-trips through the parser with no errors", () => {
    const parsed = parseRateCardCsv(unparseLikeTheExportRoute());

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(national.items.length);
  });

  it("round-trips every code and price unchanged", () => {
    const parsed = parseRateCardCsv(unparseLikeTheExportRoute());
    const { prepared, errors } = resolveAgainstNational(
      parsed.rows,
      national.itemsByCode,
    );

    expect(errors).toEqual([]);
    expect(prepared).toHaveLength(national.items.length);

    for (const row of prepared) {
      const source = national.itemsByCode.get(row.workItemCode)!;
      expect(row.rateLowGbp).toBe(source.rateLowGbp);
      expect(row.rateExpectedGbp).toBe(source.rateExpectedGbp);
      expect(row.rateHighGbp).toBe(source.rateHighGbp);
      expect(row.durationDaysLow).toBe(source.durationDaysLow);
      expect(row.durationDaysExpected).toBe(source.durationDaysExpected);
      expect(row.durationDaysHigh).toBe(source.durationDaysHigh);
    }
  });

  it("tolerates the extra `source` column, which is provenance rather than input", () => {
    // The export adds `source` so it is obvious which lines the organisation owns. It is not
    // an input column, so re-uploading the file untouched must not error on it.
    const parsed = parseRateCardCsv(unparseLikeTheExportRoute());
    const { prepared } = resolveAgainstNational(parsed.rows, national.itemsByCode);

    expect(parsed.errors).toEqual([]);
    for (const row of toCommitPayload(prepared)) {
      expect(row).not.toHaveProperty("source");
    }
  });

  it("survives the Excel round trip: BOM and CRLF", () => {
    // Excel writes both when it saves a downloaded CSV as "CSV UTF-8".
    const excel = "﻿" + unparseLikeTheExportRoute().replace(/\n/g, "\r\n");
    const parsed = parseRateCardCsv(excel);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(national.items.length);
  });

  it("carries an edited price through to the commit payload", () => {
    const edited = unparseLikeTheExportRoute().replace(
      new RegExp(`^(${national.items[0].workItemCode},[^\\n]*?,)${national.items[0].rateLowGbp},${national.items[0].rateExpectedGbp},${national.items[0].rateHighGbp}`, "m"),
      "$1111,222,333",
    );
    const parsed = parseRateCardCsv(edited);
    const { prepared, errors } = resolveAgainstNational(parsed.rows, national.itemsByCode);

    expect(parsed.errors).toEqual([]);
    expect(errors).toEqual([]);

    const payload = toCommitPayload(prepared);
    const target = payload.find(
      (row) => row.work_item_code === national.items[0].workItemCode,
    )!;
    expect(target.rate_low_gbp).toBe(111);
    expect(target.rate_expected_gbp).toBe(222);
    expect(target.rate_high_gbp).toBe(333);
  });
});
