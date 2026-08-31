import { describe, expect, it } from "vitest";
import { surveyDataForInsert, surveyDataForUpdate } from "@/lib/surveys/buildSurveyData";

/**
 * `surveys.status` is owned by /api/assessments/[id]/status. The DB transition trigger only
 * fires on UPDATE, so these two guards are what stop a save from either skipping validation
 * (insert) or tripping the trigger and losing the write (update).
 */
describe("survey status ownership", () => {
  it("pins every insert to draft, whatever the caller asked for", () => {
    expect(surveyDataForInsert({ street: "1 High Street", status: "review" })).toEqual({
      street: "1 High Street",
      status: "draft",
    });
    expect(surveyDataForInsert({ status: "complete" }).status).toBe("draft");
    expect(surveyDataForInsert({}).status).toBe("draft");
  });

  it("drops status from every update, leaving the rest untouched", () => {
    const updated = surveyDataForUpdate({
      street: "1 High Street",
      postcode: "E1 1AA",
      status: "draft",
    });
    expect(updated).toEqual({ street: "1 High Street", postcode: "E1 1AA" });
    expect("status" in updated).toBe(false);
  });

  it("leaves an update without a status alone", () => {
    expect(surveyDataForUpdate({ street: "1 High Street" })).toEqual({
      street: "1 High Street",
    });
  });
});
