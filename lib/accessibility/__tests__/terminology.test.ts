import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_ROOTS = ["app", "components", "lib", "types"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const LEGACY_TERM = new RegExp(`\\bAdop${"tion"} Plan\\b`, "i");

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
});
