import { describe, expect, it } from "vitest";
import {
  ENGINE_MODELS,
  engineUrl,
  jsonGenerationConfig,
  thinkingConfig,
} from "@/lib/engine/models";

describe("thinkingConfig", () => {
  it("nests the level under thinkingConfig", () => {
    // Regression: a flat `thinking_level` on generationConfig is what the Interactions API
    // takes. generateContent rejects it outright:
    //   400 Invalid JSON payload received.
    //   Unknown name "thinking_level" at 'generation_config': Cannot find field.
    expect(thinkingConfig("high")).toEqual({ thinkingConfig: { thinkingLevel: "high" } });
  });

  it("keeps the flat form out of a generation config", () => {
    const config = jsonGenerationConfig({ maxOutputTokens: 8192, thinkingLevel: "high" });

    expect(config).not.toHaveProperty("thinking_level");
    expect(config).not.toHaveProperty("thinkingLevel");
    expect(config).toMatchObject({
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "high" },
    });
  });

  it("never pins a temperature", () => {
    // Gemini 3 degrades when temperature is lowered; leaving it unset keeps the 1.0 default.
    expect(jsonGenerationConfig({ maxOutputTokens: 1024, thinkingLevel: "low" })).not.toHaveProperty(
      "temperature",
    );
  });

  it("only attaches a response schema when one is given", () => {
    expect(
      jsonGenerationConfig({ maxOutputTokens: 1024, thinkingLevel: "low" }),
    ).not.toHaveProperty("responseSchema");
    expect(
      jsonGenerationConfig({
        maxOutputTokens: 1024,
        thinkingLevel: "low",
        responseSchema: { type: "OBJECT" },
      }).responseSchema,
    ).toEqual({ type: "OBJECT" });
  });
});

describe("engine model registry", () => {
  it("points every task at a Gemini 3 model", () => {
    for (const [task, model] of Object.entries(ENGINE_MODELS)) {
      expect(model, task).toMatch(/^gemini-3/);
    }
  });

  it("builds the generateContent endpoint", () => {
    expect(engineUrl("gemini-3.7-flash")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
    );
  });
});
