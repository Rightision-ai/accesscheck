import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { classifyLahr } from "@/lib/accessibility/lahr/classifier";
import { mapSurveyToCase } from "@/lib/surveys/mapper";
import {
  resolveSurveyRow,
  resolveSurveyRowFromDb,
} from "@/lib/surveys/resolveSurveyRow";

const wizardData = {
  internalStairs: "Yes",
  stairBottomClearance: "N",
  stairWidth: 90,
  propertyType: "House",
  entranceLevel: "Ground",
};

/** A persisted row whose columns are sparse — the normal state, since most LAHR columns are
 *  only populated for fields the wizard actually asked about. */
function surveyRow(userOverrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    has_internal_stairs: true,
    stair_70cm_clearance: false,
    stair_width_cm: 900,
    // Pinned so `inspection_date` doesn't fall back to `new Date()`, which would make two
    // calls a millisecond apart disagree.
    inspection_date: "2026-08-01T00:00:00.000Z",
    raw_ai_data: { wizardData, rawAhr: {}, userOverrides },
    updated_at: null,
  } as never;
}

describe("resolveSurveyRow", () => {
  it("classifies differently from the raw DB row", () => {
    // The regression this helper exists for. A sparse raw row leaves most rules unevaluable,
    // so it classifies as A — which would send the cost-estimation route down its band-A
    // short-circuit and generate no plan at all, while every UI surface shows band D.
    const row = surveyRow();

    expect(classifyLahr(row).band).toBe("A");
    expect(classifyLahr(resolveSurveyRowFromDb(row)).band).toBe("D");
  });

  it("applies user overrides on top of wizard data", () => {
    expect(resolveSurveyRowFromDb(surveyRow()).stair_70cm_clearance).toBe(false);
    expect(
      resolveSurveyRowFromDb(surveyRow({ stairsClearSpaceBottom: true }))
        .stair_70cm_clearance,
    ).toBe(true);
  });

  it("lets an explicit overrides argument win over the persisted ones", () => {
    const caseData = mapSurveyToCase(surveyRow({ stairsClearSpaceBottom: true }));

    expect(resolveSurveyRow(caseData).stair_70cm_clearance).toBe(true);
    expect(
      resolveSurveyRow(caseData, { stairsClearSpaceBottom: false })
        .stair_70cm_clearance,
    ).toBe(false);
  });

  it("keeps both entry points in agreement", () => {
    const row = surveyRow({ stairsClearSpaceBottom: true });

    expect(resolveSurveyRowFromDb(row)).toEqual(
      resolveSurveyRow(mapSurveyToCase(row)),
    );
  });
});

const ROOT = resolve(import.meta.dirname, "../../..");
const SOURCE_ROOTS = ["app", "components", "lib", "types"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
/** `buildSurveyData` is the write path's mapper and this module's implementation detail.
 *  Anything else that calls it is hand-rolling the canonical row again — which is exactly how
 *  the API route and three UI surfaces drifted apart in the first place. */
const ALLOWED_CALLERS = ["lib/surveys/", "app/api/surveys/"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (path === import.meta.filename) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
  });
}

describe("buildSurveyData call sites", () => {
  it("are confined to lib/surveys and the survey write path", () => {
    const offenders = SOURCE_ROOTS.flatMap((directory) =>
      sourceFiles(join(ROOT, directory)),
    )
      .map((path) => relative(ROOT, path))
      .filter(
        (path) =>
          !ALLOWED_CALLERS.some((prefix) => path.startsWith(prefix)) &&
          readFileSync(join(ROOT, path), "utf8").includes("buildSurveyData("),
      );

    expect(offenders).toEqual([]);
  });
});
