import Papa from "papaparse";
import type { RateCardItem } from "./types";

/**
 * Every organisation's uploaded schedule of rates lives under one code, so "at most one active
 * card per (organisation, code)" means "at most one active organisation card" — which is what
 * `loadRateCardForOrganisation` needs to be deterministic.
 */
export const ORG_RATE_CARD_CODE = "org-schedule-of-rates";

/** Matches the `rate_cards_source_csv_size_check` CHECK. */
export const MAX_CSV_BYTES = 262_144;
/** A schedule of rates is tens of rows; more than this is a paste accident. */
export const MAX_CSV_ROWS = 500;
/** A £45,000,000 threshold ramp is a typo, and it should not reach a DFG panel. */
export const MAX_RATE_GBP = 1_000_000;

export type RateCardCsvIssueCode =
  | "missing_column"
  | "ambiguous_column"
  | "ignored_column"
  | "unparseable"
  | "malformed_row"
  | "empty_file"
  | "too_many_rows"
  | "too_large"
  | "not_a_number"
  | "negative_rate"
  | "implausible_rate"
  | "rate_order"
  | "duration_order"
  | "rounded"
  | "unknown_work_item_code"
  | "duplicate_work_item_code"
  | "preamble_skipped"
  | "suspect_encoding";

export type RateCardCsvIssue = {
  /** Line as it appears in a spreadsheet (header is line 1). Null for file-level issues. */
  line: number | null;
  column: string | null;
  workItemCode: string | null;
  code: RateCardCsvIssueCode;
  /** Written for a council officer, not a developer. */
  message: string;
};

export type RateCardCsvRow = {
  line: number;
  workItemCode: string;
  rateLowGbp: number;
  rateExpectedGbp: number;
  rateHighGbp: number;
  durationDaysLow: number | null;
  durationDaysExpected: number | null;
  durationDaysHigh: number | null;
  sourceLabel: string | null;
};

/** A row resolved against the national card, ready to become a commit payload element. */
export type PreparedRateCardRow = RateCardCsvRow & {
  durationDaysLow: number;
  durationDaysExpected: number;
  durationDaysHigh: number;
};

export type ParsedRateCardCsv = {
  rows: RateCardCsvRow[];
  errors: RateCardCsvIssue[];
  warnings: RateCardCsvIssue[];
};

const REQUIRED_COLUMNS = [
  "work_item_code",
  "rate_low_gbp",
  "rate_expected_gbp",
  "rate_high_gbp",
] as const;

const OPTIONAL_COLUMNS = [
  "duration_days_low",
  "duration_days_expected",
  "duration_days_high",
  "source_label",
] as const;

/**
 * Councils export from Excel and from their own finance systems, so the same column arrives
 * under several names. `description` is deliberately accepted-and-ignored rather than rejected:
 * the template ships it so the officer can see what they are pricing, and the download →
 * edit → upload round trip has to survive.
 */
const HEADER_ALIASES: Record<string, string> = {
  code: "work_item_code",
  item_code: "work_item_code",
  work_item: "work_item_code",
  low: "rate_low_gbp",
  min: "rate_low_gbp",
  rate_low: "rate_low_gbp",
  expected: "rate_expected_gbp",
  rate: "rate_expected_gbp",
  price: "rate_expected_gbp",
  rate_expected: "rate_expected_gbp",
  high: "rate_high_gbp",
  max: "rate_high_gbp",
  rate_high: "rate_high_gbp",
  days: "duration_days_expected",
  duration_days: "duration_days_expected",
  label: "source_label",
  // Deliberately no `source` alias. The export writes a `source` column holding "accesscheck" or
  // "organisation" — provenance, not a price label — alongside `source_label`, so aliasing the
  // two together made the app's own download fail to re-upload ("two columns both mean
  // source_label"), and a file carrying only `source` would have written "accesscheck" as the
  // label on every line. It is ignored instead; see IGNORED_COLUMNS.
};

const IGNORED_COLUMNS = new Set([
  "description",
  "unit",
  "difficulty",
  "trades",
  "addresses_rule_numbers",
  "priority_hint",
  "preconditions",
  "field_patches",
  "source",
]);

function normaliseHeader(header: string): string {
  const cleaned = header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return HEADER_ALIASES[cleaned] ?? cleaned;
}

/**
 * Money as a council types it: `£1,234`, `1 234`, `1234.50`.
 * Returns null when the text is not a number at all — the caller decides the message.
 */
function parseMoney(raw: string): { value: number; rounded: boolean } | null {
  const cleaned = raw.replace(/[£$,\s]/g, "");
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const exact = Number(cleaned);
  if (!Number.isFinite(exact)) return null;
  const value = Math.round(exact);
  return { value, rounded: value !== exact };
}

function parseCount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned));
}

/** How many lines above the header we are willing to skip. */
const MAX_PREAMBLE_LINES = 10;

/**
 * Find the header row, which is not always the first line.
 *
 * Numbers and Excel both write the table or sheet name as a title row above the header when
 * they save a CSV, so downloading our own template, opening it and saving it produces a file
 * whose line 1 is `accesscheck-schedule-of-rates-template,,,,,,,,`. Taking line 1 as the header made
 * every required column look missing and every real column look unrecognised — eleven errors,
 * none of which named the actual problem.
 *
 * Returns the character offset of the header line and how many lines precede it, so reported
 * line numbers still match what the officer sees in their spreadsheet.
 */
function findHeaderLine(text: string): { charIndex: number; preambleLines: number } {
  let charIndex = 0;
  for (let lineIndex = 0; lineIndex < MAX_PREAMBLE_LINES; lineIndex++) {
    const newline = text.indexOf("\n", charIndex);
    const end = newline === -1 ? text.length : newline;
    const line = text.slice(charIndex, end).replace(/\r$/, "");
    const headers = (Papa.parse<string[]>(line).data[0] ?? []).map(normaliseHeader);
    // `work_item_code` is the one column that cannot be defaulted or inherited, so it is the
    // only reliable marker. A file genuinely missing it is not helped by scanning further, and
    // falls through to the existing "column is required" error.
    if (headers.includes("work_item_code")) return { charIndex, preambleLines: lineIndex };
    if (newline === -1) break;
    charIndex = newline + 1;
  }
  return { charIndex: 0, preambleLines: 0 };
}

/**
 * C1 control characters (U+0080–U+009F) never occur in legitimate text. They appear when a
 * UTF-8 file is read as Windows-1252 and saved again, which is what turns
 * `AccessCheck estimation – obtain quote` into `AccessCheck estimation â obtain quote`. The file
 * still parses, so this is a warning — but `source_label` is printed on the plan a council
 * takes to a DFG panel, and garbled text should be caught before publishing, not after.
 */
const MOJIBAKE = /[\u0080-\u009F\uFFFD]/;

const issue = (
  code: RateCardCsvIssueCode,
  message: string,
  extra: Partial<RateCardCsvIssue> = {},
): RateCardCsvIssue => ({
  line: null,
  column: null,
  workItemCode: null,
  ...extra,
  code,
  message,
});

/**
 * Parse a schedule-of-rates CSV.
 *
 * Two deliberate departures from the CSV handling elsewhere in this codebase:
 *
 * 1. `skipEmptyLines: false`. Papaparse reports `errors[].row` as an index into the *post-skip*
 *    data array, so with skipping enabled an error after a blank line points at the wrong line
 *    and the officer is sent hunting. Blanks are filtered here instead, keeping the raw index.
 * 2. `result.errors` is read. Both existing parsers discard it, so a malformed row silently
 *    vanishes — tolerable for a 5,000-row stock list, not for a 20-row price schedule where a
 *    dropped line means an adaptation is quietly mispriced.
 */
export function parseRateCardCsv(text: string): ParsedRateCardCsv {
  const errors: RateCardCsvIssue[] = [];
  const warnings: RateCardCsvIssue[] = [];
  const empty: ParsedRateCardCsv = { rows: [], errors, warnings };

  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) {
    errors.push(
      issue("too_large", `That file is larger than ${MAX_CSV_BYTES / 1024} KB. A schedule of rates should be a few kilobytes — check you have not attached a stock list.`),
    );
    return empty;
  }
  if (text.trim() === "") {
    errors.push(issue("empty_file", "That file is empty."));
    return empty;
  }

  if (MOJIBAKE.test(text)) {
    warnings.push(
      issue("suspect_encoding", 'Some characters in this file look corrupted (for example "â€" where a dash or a £ should be). Re-export it from your spreadsheet as "CSV UTF-8" if any label reads wrongly in the preview below.'),
    );
  }

  // The header is not always line 1 — spreadsheet apps write the sheet name above it. Work
  // from the header line onwards, and keep the offset so reported line numbers still match
  // what the officer sees.
  const { charIndex, preambleLines } = findHeaderLine(text);
  const body = charIndex === 0 ? text : text.slice(charIndex);
  const lineOf = (index: number) => index + 2 + preambleLines;
  if (preambleLines > 0) {
    warnings.push(
      issue("preamble_skipped", `Ignored ${preambleLines} line${preambleLines === 1 ? "" : "s"} above the column headings — spreadsheet apps often add the file name as a title row.`),
    );
  }

  // Papaparse silently renames a duplicate header to `<name>_1`, so `meta.fields` never
  // collides and the second column would be quietly ignored. Normalise the header line
  // ourselves to catch two columns that mean the same thing.
  const headerLine = body.slice(0, (body.indexOf("\n") + 1 || body.length + 1) - 1);
  const rawHeaders = (Papa.parse<string[]>(headerLine).data[0] ?? []).map(normaliseHeader);
  const duplicated = rawHeaders.filter(
    (header, index) => header !== "" && rawHeaders.indexOf(header) !== index,
  );
  for (const header of new Set(duplicated)) {
    errors.push(
      issue("ambiguous_column", `Two columns both mean "${header}". Remove one before uploading.`, { column: header }),
    );
  }

  const parsed = Papa.parse<Record<string, string>>(body, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (header) => normaliseHeader(header),
  });

  // A broken quote or an undetectable delimiter means the field split itself is untrustworthy,
  // so every row error after it would be noise. Stop here instead.
  const fields = parsed.meta.fields ?? [];
  const fatal = parsed.errors.filter((error) => {
    const code = error.code ?? "";
    if (code === "MissingQuotes" || code === "InvalidQuotes") return true;
    // Papaparse reports UndetectableDelimiter on files it nonetheless split correctly, so only
    // trust it when the split really did fail to produce columns.
    return code === "UndetectableDelimiter" && fields.length < 2;
  });
  if (fatal.length > 0) {
    errors.push(
      issue("unparseable", `That file could not be read as CSV (${fatal[0].message}). If it was exported from Excel, use "CSV UTF-8".`),
    );
    return empty;
  }

  const headers = parsed.meta.fields ?? [];

  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      errors.push(issue("missing_column", `The column "${required}" is required.`, { column: required }));
    }
  }
  for (const header of headers) {
    const known =
      (REQUIRED_COLUMNS as readonly string[]).includes(header) ||
      (OPTIONAL_COLUMNS as readonly string[]).includes(header);
    if (!known && header !== "") {
      warnings.push(
        issue("ignored_column", IGNORED_COLUMNS.has(header)
          ? `"${header}" is set from the national card and was ignored.`
          : `"${header}" is not a recognised column and was ignored.`, { column: header }),
      );
    }
  }
  if (errors.length > 0) return empty;

  const isBlankRecord = (record: Record<string, string> | undefined) =>
    record === undefined ||
    Object.values(record).every((value) => (value ?? "").trim() === "");

  // Row-level papaparse complaints, keyed to the spreadsheet line. Blank lines and the trailing
  // newline every editor adds also arrive as TooFewFields — those are not the user's problem.
  for (const error of parsed.errors) {
    if (typeof error.row !== "number") continue;
    if (isBlankRecord(parsed.data[error.row])) continue;
    errors.push(
      issue("malformed_row", `This line has the wrong number of columns (${error.message}).`, {
        line: lineOf(error.row),
      }),
    );
  }

  const rows: RateCardCsvRow[] = [];
  parsed.data.forEach((record, index) => {
    const line = lineOf(index);
    const cell = (column: string) => (record[column] ?? "").trim();
    if (isBlankRecord(record)) return;

    const workItemCode = cell("work_item_code");
    if (workItemCode === "") {
      errors.push(issue("missing_column", "This line has no work item code.", { line, column: "work_item_code" }));
      return;
    }

    const money: Record<string, number> = {};
    let moneyFailed = false;
    for (const column of ["rate_low_gbp", "rate_expected_gbp", "rate_high_gbp"] as const) {
      const raw = cell(column);
      const parsedMoney = parseMoney(raw);
      if (parsedMoney === null) {
        errors.push(
          issue("not_a_number", raw === ""
            ? `"${column}" is missing.`
            : `"${raw}" is not a price.`, { line, column, workItemCode }),
        );
        moneyFailed = true;
        continue;
      }
      if (parsedMoney.value < 0) {
        errors.push(issue("negative_rate", `"${column}" cannot be negative.`, { line, column, workItemCode }));
        moneyFailed = true;
        continue;
      }
      if (parsedMoney.value > MAX_RATE_GBP) {
        errors.push(
          issue("implausible_rate", `£${parsedMoney.value.toLocaleString("en-GB")} looks like a typo — the maximum accepted is £${MAX_RATE_GBP.toLocaleString("en-GB")}.`, { line, column, workItemCode }),
        );
        moneyFailed = true;
        continue;
      }
      if (parsedMoney.rounded) {
        warnings.push(
          issue("rounded", `"${raw}" was rounded to £${parsedMoney.value.toLocaleString("en-GB")} — rates are whole pounds.`, { line, column, workItemCode }),
        );
      }
      money[column] = parsedMoney.value;
    }
    if (moneyFailed) return;

    if (!(money.rate_low_gbp <= money.rate_expected_gbp && money.rate_expected_gbp <= money.rate_high_gbp)) {
      errors.push(
        issue("rate_order", `Prices must run low ≤ expected ≤ high (got £${money.rate_low_gbp.toLocaleString("en-GB")}, £${money.rate_expected_gbp.toLocaleString("en-GB")}, £${money.rate_high_gbp.toLocaleString("en-GB")}).`, { line, workItemCode }),
      );
      return;
    }

    const durations: Record<string, number | null> = {};
    let durationFailed = false;
    for (const column of ["duration_days_low", "duration_days_expected", "duration_days_high"] as const) {
      const raw = cell(column);
      if (raw === "") {
        durations[column] = null;
        continue;
      }
      const value = parseCount(raw);
      if (value === null) {
        errors.push(issue("not_a_number", `"${raw}" is not a number of days.`, { line, column, workItemCode }));
        durationFailed = true;
        continue;
      }
      durations[column] = value;
    }
    if (durationFailed) return;

    const sourceLabel = cell("source_label");
    rows.push({
      line,
      workItemCode,
      rateLowGbp: money.rate_low_gbp,
      rateExpectedGbp: money.rate_expected_gbp,
      rateHighGbp: money.rate_high_gbp,
      durationDaysLow: durations.duration_days_low,
      durationDaysExpected: durations.duration_days_expected,
      durationDaysHigh: durations.duration_days_high,
      sourceLabel: sourceLabel === "" ? null : sourceLabel.slice(0, 200),
    });
  });

  if (rows.length > MAX_CSV_ROWS) {
    errors.push(issue("too_many_rows", `That file has ${rows.length} rows; the maximum is ${MAX_CSV_ROWS}.`));
    return empty;
  }
  if (rows.length === 0 && errors.length === 0) {
    errors.push(issue("empty_file", "That file has a header but no priced rows."));
  }

  return { rows, errors, warnings };
}

/**
 * Second pass: check each row against the national card and fill the durations it omitted.
 *
 * An upload prices work the national card already defines. It cannot invent a work item,
 * because a new item would need rule mappings and `field_patches` nobody has validated, and the
 * engine is never prompted with it — so it could never clear a rule however it were priced.
 */
export function resolveAgainstNational(
  rows: RateCardCsvRow[],
  nationalByCode: ReadonlyMap<string, RateCardItem>,
): { prepared: PreparedRateCardRow[]; errors: RateCardCsvIssue[] } {
  const errors: RateCardCsvIssue[] = [];
  const prepared: PreparedRateCardRow[] = [];
  const firstSeenAt = new Map<string, number>();

  for (const row of rows) {
    const national = nationalByCode.get(row.workItemCode);
    if (!national) {
      errors.push(
        issue("unknown_work_item_code", `"${row.workItemCode}" is not a work item AccessCheck prices. Upload a file that only prices the codes in the template.`, { line: row.line, column: "work_item_code", workItemCode: row.workItemCode }),
      );
      continue;
    }

    const seen = firstSeenAt.get(row.workItemCode);
    if (seen !== undefined) {
      errors.push(
        issue("duplicate_work_item_code", `"${row.workItemCode}" was already priced on line ${seen}.`, { line: row.line, column: "work_item_code", workItemCode: row.workItemCode }),
      );
      continue;
    }
    firstSeenAt.set(row.workItemCode, row.line);

    const durationDaysLow = row.durationDaysLow ?? national.durationDaysLow;
    const durationDaysExpected = row.durationDaysExpected ?? national.durationDaysExpected;
    const durationDaysHigh = row.durationDaysHigh ?? national.durationDaysHigh;

    // Checked after inheritance: a file that sets only `high` can still contradict the
    // national low/expected it inherited.
    if (!(durationDaysLow <= durationDaysExpected && durationDaysExpected <= durationDaysHigh)) {
      errors.push(
        issue("duration_order", `Durations must run low ≤ expected ≤ high (got ${durationDaysLow}, ${durationDaysExpected}, ${durationDaysHigh} after filling in the national values for any you left blank).`, { line: row.line, workItemCode: row.workItemCode }),
      );
      continue;
    }

    prepared.push({ ...row, durationDaysLow, durationDaysExpected, durationDaysHigh });
  }

  return { prepared, errors };
}

/** Exactly the element shape `commit_rate_card_version`'s `payload` expects. */
export function toCommitPayload(
  prepared: PreparedRateCardRow[],
): Record<string, unknown>[] {
  return prepared.map((row) => ({
    work_item_code: row.workItemCode,
    rate_low_gbp: row.rateLowGbp,
    rate_expected_gbp: row.rateExpectedGbp,
    rate_high_gbp: row.rateHighGbp,
    duration_days_low: row.durationDaysLow,
    duration_days_expected: row.durationDaysExpected,
    duration_days_high: row.durationDaysHigh,
    ...(row.sourceLabel ? { source_label: row.sourceLabel } : {}),
  }));
}
