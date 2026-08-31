import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { ENGINE_DISPLAY_NAME } from "@/lib/engine/models";
import { redactVendor } from "@/lib/engine/engineClient";

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_ROOTS = ["app", "components", "lib", "scripts"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const VENDOR = /gemini/i;

/**
 * `lib/engine/models.ts` is the one place the model id is chosen, so it necessarily names it.
 * Nothing it emits reaches a user: the ids go into a request URL and the `engine_model` column.
 */
const ALLOWED_FILES = new Set([
  "lib/engine/models.ts",
  // redactVendor has to name the strings it strips.
  "lib/engine/engineClient.ts",
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
  });
}

type Line = { path: string; number: number; text: string };

function lines(): Line[] {
  return SOURCE_ROOTS.flatMap((directory) => {
    try {
      return sourceFiles(join(ROOT, directory));
    } catch {
      return [];
    }
  })
    .map((absolute) => relative(ROOT, absolute))
    .filter((path) => !path.includes("__tests__") && !ALLOWED_FILES.has(path))
    .flatMap((path) =>
      readFileSync(join(ROOT, path), "utf8")
        .split("\n")
        .map((text, index) => ({ path, number: index + 1, text })),
    );
}

/** A `//` or `/* *` line is documentation for the next developer, not product output. */
const isComment = (line: Line) => /^\s*(\/\/|\/\*|\*)/.test(line.text);

const show = (found: Line[]) => found.map((l) => `${l.path}:${l.number} ${l.text.trim()}`);

describe("engine branding", () => {
  it("names the engine Rightision AI Engine", () => {
    expect(ENGINE_DISPLAY_NAME).toBe("Rightision AI Engine");
  });

  it("never names the vendor in anything a user can reach", () => {
    // Covers rendered copy, thrown Error messages, and console output — the browser console is
    // one keystroke away for any user, so a client-side log is a user-facing surface.
    expect(show(lines().filter((l) => !isComment(l) && VENDOR.test(l.text)))).toEqual([]);
  });

  it("never renders the raw model id from a plan", () => {
    // `engineModel` is persisted for attribution when a plan is questioned later. Interpolating
    // it into copy leaks the model name onto the case view and into the report PDF.
    expect(
      show(lines().filter((l) => /\{\s*\w+\.engineModel\s*\}/.test(l.text))),
    ).toEqual([]);
  });
});

describe("redactVendor", () => {
  it("strips the model from an upstream error before it reaches the user", () => {
    // This is the path that put `Engine 400: …` on screen: the raw upstream body is stored on
    // the job status and rendered verbatim in the plan's error banner.
    const upstream =
      '{"error":{"message":"models/gemini-3.7-flash is not found for API version v1beta","status":"NOT_FOUND"}}';

    const redacted = redactVendor(upstream);

    expect(redacted).not.toMatch(VENDOR);
    expect(redacted).toContain("the engine model is not found");
    expect(redacted).toContain("NOT_FOUND");
  });

  it("strips the endpoint host and the proto namespace", () => {
    for (const upstream of [
      "failed to reach generativelanguage.googleapis.com",
      "Invalid value at type.googleapis.com/google.ai.generativelanguage.v1beta.ThinkingConfig",
      "quota exceeded for project on Google AI",
    ]) {
      expect(redactVendor(upstream), upstream).not.toMatch(
        /gemini|generativelanguage|googleapis|\bgoogle\b/i,
      );
    }
  });

  it("leaves an error with nothing to redact alone", () => {
    const clean = "Engine 429: rate limit exceeded, retry after 30s";

    expect(redactVendor(clean)).toBe(clean);
  });
});
