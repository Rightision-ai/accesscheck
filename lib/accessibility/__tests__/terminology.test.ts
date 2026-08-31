import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_ROOTS = ["app", "components", "lib", "types"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const LEGACY_TERM = new RegExp(`\\bAdop${"tion"} Plan\\b`, "i");

/**
 * The mechanical Adoption -> Adaptation rename kept the capital A in positions where it is
 * now grammatically wrong ("Generating Adaptation plan", "No Adaptation available", "the DFG
 * Adaptation Plan below"). To an OT that reads as a typo in the product's core noun.
 *
 * "Adaptation" is capitalised only as a standalone heading ("DFG Adaptation Plan",
 * "Adaptation Plans") or as part of an identifier, so this only looks for the word preceded
 * by a determiner or a verb — never at the start of a line.
 *
 * `Adaptation Plans` (plural, both capitalised) is exempt wherever it appears: that is the
 * literal name of the tab and of the card heading, so "the Adaptation Plans tab" is correct.
 * `Adaptation plan` and `Adaptation Plan` are still caught — those are the common noun.
 */
const MID_SENTENCE_CAPITAL =
  /\b(?:the|a|an|this|each|The|A|An|This|Each|No|Generating|generating)\s+(?:DFG\s+)?Adaptation\b(?!\s+Plans\b)/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (path === import.meta.filename) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
  });
}

describe("adaptation terminology", () => {
  it("does not expose the legacy plan name in product source", () => {
    const offenders = SOURCE_ROOTS.flatMap((directory) =>
      sourceFiles(join(ROOT, directory)),
    ).filter((path) => LEGACY_TERM.test(readFileSync(path, "utf8")));

    expect(offenders.map((path) => relative(ROOT, path))).toEqual([]);
  });

  it("does not capitalise adaptation mid-sentence", () => {
    const offenders = SOURCE_ROOTS.flatMap((directory) =>
      sourceFiles(join(ROOT, directory)),
    ).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          MID_SENTENCE_CAPITAL.test(line)
            ? [`${relative(ROOT, path)}:${index + 1} ${line.trim()}`]
            : [],
        ),
    );

    expect(offenders).toEqual([]);
  });
});
