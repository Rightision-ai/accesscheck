import { describe, expect, it } from "vitest";
import { parseEngineJson, repairJson } from "@/lib/engine/json";

/** Parse via the repairer, the way the engine routes do on a failed first parse. */
function repaired(text: string): unknown {
  return JSON.parse(repairJson(text));
}

describe("repairJson", () => {
  it("leaves valid JSON untouched", () => {
    const valid = '{"candidates":[{"id":"a","cost":1800}],"confidence":0.7}';

    expect(repairJson(valid)).toBe(valid);
    expect(repaired(valid)).toEqual({
      candidates: [{ id: "a", cost: 1800 }],
      confidence: 0.7,
    });
  });

  it("strips a markdown fence", () => {
    expect(repaired('```json\n{"id":"a"}\n```')).toEqual({ id: "a" });
    expect(repaired('```\n{"id":"a"}\n```')).toEqual({ id: "a" });
  });

  it("drops a trailing comma before a close bracket", () => {
    expect(repaired('{"trades":["carpentry","plastering",],}')).toEqual({
      trades: ["carpentry", "plastering"],
    });
  });

  it("closes brackets left open by a truncated response", () => {
    expect(repaired('{"candidates":[{"id":"a"}')).toEqual({
      candidates: [{ id: "a" }],
    });
  });

  it("drops the half-written field of an element truncated mid-string", () => {
    // The MAX_TOKENS case. The repairer rewinds to the last complete key/value boundary, so
    // the unfinished element survives with only the fields that were fully written — it never
    // closes the dangling quote, which would invent a label the model never finished.
    // A candidate left without a label is then discarded downstream by the pool sanitiser.
    const result = repaired(
      '{"candidates":[{"id":"a","label":"Widen the entrance door"},{"id":"b","label":"Convert the bath',
    ) as { candidates: { id: string; label?: string }[] };

    expect(result.candidates).toEqual([
      { id: "a", label: "Widen the entrance door" },
      { id: "b" },
    ]);
  });

  it("keeps escaped quotes inside a string intact", () => {
    expect(repaired('{"narrative":"The tenant\\"s bathroom","id":"a"}')).toEqual({
      narrative: 'The tenant"s bathroom',
      id: "a",
    });
  });
});

describe("parseEngineJson", () => {
  it("parses a clean response", () => {
    expect(parseEngineJson('{"section_fill":{"bedroom_count":2}}')).toEqual({
      result: { section_fill: { bedroom_count: 2 } },
      recovered: false,
    });
  });

  it("parses a response the model wrapped in a markdown fence", () => {
    const parsed = parseEngineJson('```json\n{"Confidence":"LOW"}\n```');

    expect(parsed.result).toEqual({ Confidence: "LOW" });
    expect(parsed.recovered).toBe(false);
  });

  it("recovers the complete fields of a report-fill cut off at MAX_TOKENS", () => {
    // The shape of a real failure: everything up to "gaps" was written, then the model ran out
    // of budget partway through a gap entry. The naive `match(/\{[\s\S]*\}/)` the routes used
    // to run ended at the last complete gap's brace and threw away the whole assessment.
    const truncated =
      '{"section_fill":{"property_type":"Flat","bedroom_count":2},' +
      '"Confidence":"LOW","Summary":{"Strengths":"Step-free access"},' +
      '"gaps":[{"field":"internal_stair_width_cm","reason":"no internal stairs"},{"';

    const parsed = parseEngineJson<{
      section_fill: { property_type: string };
      Summary: { Strengths: string };
      gaps: { field: string }[];
    }>(truncated);

    expect(parsed.recovered).toBe(true);
    expect(parsed.result?.section_fill.property_type).toBe("Flat");
    expect(parsed.result?.Summary.Strengths).toBe("Step-free access");
    expect(parsed.result?.gaps).toEqual([
      { field: "internal_stair_width_cm", reason: "no internal stairs" },
    ]);
  });

  it("returns null when there is no object at all", () => {
    expect(parseEngineJson("I cannot help with that.")).toEqual({
      result: null,
      recovered: false,
    });
  });
});
