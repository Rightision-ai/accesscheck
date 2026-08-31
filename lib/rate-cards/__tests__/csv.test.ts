import { describe, expect, it } from "vitest";
import {
  MAX_RATE_GBP,
  parseRateCardCsv,
  resolveAgainstNational,
  toCommitPayload,
} from "@/lib/rate-cards/csv";
import { nationalIndicativeCard } from "@/lib/rate-cards/nationalIndicative";

const national = nationalIndicativeCard().itemsByCode;

const HEADER = "work_item_code,rate_low_gbp,rate_expected_gbp,rate_high_gbp";
const csv = (...lines: string[]) => [HEADER, ...lines].join("\n");

/** Codes and their errors, so assertions read as "which line, what went wrong". */
const codes = (issues: { code: string }[]) => issues.map((i) => i.code);
const lines = (issues: { line: number | null }[]) => issues.map((i) => i.line);

describe("parseRateCardCsv — headers", () => {
  it("accepts a clean file", () => {
    const { rows, errors } = parseRateCardCsv(csv("threshold_ramp,300,520,900"));

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      line: 2,
      workItemCode: "threshold_ramp",
      rateLowGbp: 300,
      rateExpectedGbp: 520,
      rateHighGbp: 900,
    });
  });

  it("tolerates a BOM, CRLF and mixed-case spaced headers", () => {
    // Precisely what Excel produces, which is what councils will send.
    const text = "﻿Work Item Code,Rate Low GBP,Rate Expected GBP,Rate High GBP\r\nthreshold_ramp,300,520,900\r\n";

    const { rows, errors } = parseRateCardCsv(text);

    expect(errors).toEqual([]);
    expect(rows[0].workItemCode).toBe("threshold_ramp");
  });

  it("maps common aliases to the canonical columns", () => {
    const { rows, errors } = parseRateCardCsv("code,low,expected,high\nthreshold_ramp,300,520,900");

    expect(errors).toEqual([]);
    expect(rows[0].rateExpectedGbp).toBe(520);
  });

  it("rejects a missing required column", () => {
    const { errors } = parseRateCardCsv("work_item_code,rate_low_gbp\nthreshold_ramp,300");

    expect(codes(errors)).toContain("missing_column");
  });

  it("rejects two columns meaning the same thing rather than silently taking one", () => {
    const { errors } = parseRateCardCsv(
      "work_item_code,rate_expected_gbp,price,rate_low_gbp,rate_high_gbp\nthreshold_ramp,520,999,300,900",
    );

    expect(codes(errors)).toContain("ambiguous_column");
  });

  it("warns once per ignored column, not once per row", () => {
    const { rows, warnings } = parseRateCardCsv(
      `${HEADER},description,field_patches\nthreshold_ramp,300,520,900,Ramp,{}\nhandrail_install,200,390,700,Rail,{}`,
    );

    expect(rows).toHaveLength(2);
    const ignored = warnings.filter((w) => w.code === "ignored_column");
    expect(ignored).toHaveLength(2);
    expect(ignored.map((w) => w.column).sort()).toEqual(["description", "field_patches"]);
  });
});

describe("parseRateCardCsv — numbers", () => {
  it("accepts money as a council types it", () => {
    const { rows, errors } = parseRateCardCsv(csv('threshold_ramp,"£1,200",£1500,"1 800"'));

    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ rateLowGbp: 1200, rateExpectedGbp: 1500, rateHighGbp: 1800 });
  });

  it("rounds pence to whole pounds and warns rather than failing", () => {
    const { rows, errors, warnings } = parseRateCardCsv(csv("threshold_ramp,300,520.50,900"));

    expect(errors).toEqual([]);
    expect(rows[0].rateExpectedGbp).toBe(521);
    expect(codes(warnings)).toContain("rounded");
  });

  it("rejects text, negatives and typo-scale figures", () => {
    expect(codes(parseRateCardCsv(csv("threshold_ramp,300,n/a,900")).errors)).toContain("not_a_number");
    expect(codes(parseRateCardCsv(csv("threshold_ramp,-5,520,900")).errors)).toContain("negative_rate");
    expect(
      codes(parseRateCardCsv(csv(`threshold_ramp,300,${MAX_RATE_GBP + 1},900`)).errors),
    ).toContain("implausible_rate");
  });

  it("rejects prices that are not low <= expected <= high", () => {
    const { errors } = parseRateCardCsv(csv("threshold_ramp,900,520,300"));

    expect(codes(errors)).toEqual(["rate_order"]);
  });
});

describe("parseRateCardCsv — line numbers and papaparse errors", () => {
  it("numbers lines as the spreadsheet does, across a blank line", () => {
    // The reason this parser uses skipEmptyLines: false. With skipping on, papaparse indexes
    // errors into the post-skip array, so everything after a blank line is reported one line
    // early and the officer is sent hunting.
    const { rows, errors } = parseRateCardCsv(
      csv("threshold_ramp,300,520,900", "", "handrail_install,200,bad,700"),
    );

    expect(rows.map((r) => r.line)).toEqual([2]);
    expect(lines(errors)).toEqual([4]);
  });

  it("surfaces a malformed row instead of dropping it", () => {
    // Both existing CSV parsers in this repo discard Papa.parse().errors entirely.
    const { errors } = parseRateCardCsv(csv("threshold_ramp,300,520,900,extra,extra2"));

    expect(codes(errors)).toContain("malformed_row");
  });

  it("stops on an unterminated quote rather than reporting noise per row", () => {
    const { errors, rows } = parseRateCardCsv(csv('threshold_ramp,300,"520,900', "handrail_install,200,390,700"));

    expect(rows).toEqual([]);
    expect(codes(errors)).toEqual(["unparseable"]);
  });

  it("rejects an empty file and a header with no rows", () => {
    expect(codes(parseRateCardCsv("").errors)).toEqual(["empty_file"]);
    expect(codes(parseRateCardCsv(HEADER).errors)).toEqual(["empty_file"]);
  });
});

describe("resolveAgainstNational", () => {
  const parse = (...rows: string[]) => parseRateCardCsv(csv(...rows)).rows;

  it("inherits every duration the file omits", () => {
    const { prepared, errors } = resolveAgainstNational(parse("wet_room_conversion,6000,9200,15000"), national);
    const nationalItem = national.get("wet_room_conversion")!;

    expect(errors).toEqual([]);
    expect(prepared[0]).toMatchObject({
      durationDaysLow: nationalItem.durationDaysLow,
      durationDaysExpected: nationalItem.durationDaysExpected,
      durationDaysHigh: nationalItem.durationDaysHigh,
    });
  });

  it("validates duration order after inheritance, not before", () => {
    // Only `low` is given, and it contradicts the national expected it inherits.
    const rows = parseRateCardCsv(
      `${HEADER},duration_days_low\nwet_room_conversion,6000,9200,15000,99`,
    ).rows;

    expect(codes(resolveAgainstNational(rows, national).errors)).toEqual(["duration_order"]);
  });

  it("rejects a code the national card does not define", () => {
    const { prepared, errors } = resolveAgainstNational(parse("solid_gold_bath,1,2,3"), national);

    expect(prepared).toEqual([]);
    expect(errors[0]).toMatchObject({ code: "unknown_work_item_code", line: 2 });
  });

  it("rejects a duplicate on the second line and names the first", () => {
    const { prepared, errors } = resolveAgainstNational(
      parse("threshold_ramp,300,520,900", "threshold_ramp,310,530,910"),
      national,
    );

    expect(prepared).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: "duplicate_work_item_code", line: 3 });
    expect(errors[0].message).toContain("line 2");
  });
});

describe("toCommitPayload", () => {
  it("produces exactly the shape the SQL function reads", () => {
    const rows = parseRateCardCsv(csv("threshold_ramp,300,520,900")).rows;
    const { prepared } = resolveAgainstNational(rows, national);

    expect(toCommitPayload(prepared)[0]).toEqual({
      work_item_code: "threshold_ramp",
      rate_low_gbp: 300,
      rate_expected_gbp: 520,
      rate_high_gbp: 900,
      duration_days_low: 1,
      duration_days_expected: 1,
      duration_days_high: 1,
    });
  });

  it("omits source_label when the file did not set one", () => {
    const rows = parseRateCardCsv(csv("threshold_ramp,300,520,900")).rows;
    const { prepared } = resolveAgainstNational(rows, national);

    // The SQL COALESCEs a missing label to the card label, so sending "" would defeat it.
    expect(toCommitPayload(prepared)[0]).not.toHaveProperty("source_label");
  });
});
