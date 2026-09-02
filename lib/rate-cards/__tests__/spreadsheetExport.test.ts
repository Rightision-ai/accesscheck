import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accesscheckEstimationCard } from "@/lib/rate-cards/accesscheckEstimation";
import { parseRateCardCsv, resolveAgainstNational } from "@/lib/rate-cards/csv";

/**
 * The file an officer actually uploads.
 *
 * `fixtures/numbers-export.csv` is a real failed upload: our own template, downloaded, opened
 * in a spreadsheet and saved again. Saving added the file name as a title row above the
 * header, and the save re-encoded the en dash in `source_label` into mojibake. The title row
 * alone produced eleven errors, none of which named it — every required column read as
 * missing, because line 1 was taken as the header unconditionally.
 */
const fixture = readFileSync(
  join(__dirname, "fixtures", "numbers-export.csv"),
  "utf8",
);

describe("a template saved by a spreadsheet app", () => {
  const national = accesscheckEstimationCard();

  it("parses despite the title row the spreadsheet added", () => {
    const parsed = parseRateCardCsv(fixture);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(4);
    expect(parsed.rows.map((row) => row.workItemCode)).toEqual([
      "threshold_ramp",
      "handrail_install",
      "door_widening_entry",
      "wet_room_conversion",
    ]);
  });

  it("says it skipped the title row rather than skipping it silently", () => {
    const parsed = parseRateCardCsv(fixture);
    const skipped = parsed.warnings.find((issue) => issue.code === "preamble_skipped");

    expect(skipped?.message).toContain("Ignored 1 line above the column headings");
  });

  it("keeps line numbers matching the spreadsheet", () => {
    // The header is on line 2, so the first priced row is line 3. Getting this wrong sends an
    // officer to the wrong row of a file they are looking at.
    const parsed = parseRateCardCsv(fixture);
    expect(parsed.rows[0].line).toBe(3);
    expect(parsed.rows[3].line).toBe(6);
  });

  it("reports a bad row at the line the officer sees", () => {
    const broken = fixture.replace("500,800,1000", "500,not-a-price,1000");
    const parsed = parseRateCardCsv(broken);

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].line).toBe(3);
    expect(parsed.errors[0].code).toBe("not_a_number");
  });

  it("warns that the re-encoding corrupted characters", () => {
    const parsed = parseRateCardCsv(fixture);
    const encoding = parsed.warnings.find((issue) => issue.code === "suspect_encoding");

    // A warning, not an error: the prices are fine and the officer may not care about the
    // label. But it is printed on the plan, so it must not pass unremarked.
    expect(encoding).toBeDefined();
    expect(parsed.errors).toEqual([]);
  });

  it("resolves every row against the national card", () => {
    const parsed = parseRateCardCsv(fixture);
    const { prepared, errors } = resolveAgainstNational(parsed.rows, national.itemsByCode);

    expect(errors).toEqual([]);
    expect(prepared).toHaveLength(4);
    expect(prepared[0].rateExpectedGbp).toBe(800);
  });
});

describe("header detection", () => {
  const header =
    "work_item_code,rate_low_gbp,rate_expected_gbp,rate_high_gbp\nthreshold_ramp,1,2,3\n";

  it("leaves a well-formed file alone", () => {
    const parsed = parseRateCardCsv(header);
    expect(parsed.warnings.filter((issue) => issue.code === "preamble_skipped")).toEqual([]);
    expect(parsed.rows[0].line).toBe(2);
  });

  it("skips several preamble lines, as a finance system export carries", () => {
    const parsed = parseRateCardCsv(`Schedule of rates\nExported 2026-08-31\n\n${header}`);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].line).toBe(5);
  });

  it("still reports a genuinely missing column rather than scanning past the end", () => {
    // No `work_item_code` anywhere means no header to find. The officer should get the real
    // error, not a report about preamble.
    const parsed = parseRateCardCsv("rate_low_gbp,rate_expected_gbp\n1,2\n");

    expect(parsed.errors.map((issue) => issue.column)).toContain("work_item_code");
    expect(parsed.warnings.filter((issue) => issue.code === "preamble_skipped")).toEqual([]);
  });

  it("does not hunt indefinitely for a header", () => {
    // A stock list or a pasted report should fail as an unrecognised file, not scan 5,000 rows
    // hoping to find something.
    const parsed = parseRateCardCsv(`${"noise,noise\n".repeat(50)}${header}`);
    expect(parsed.errors.map((issue) => issue.column)).toContain("work_item_code");
  });
});
