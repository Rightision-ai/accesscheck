import { describe, it, expect } from "vitest";
import {
  normalizeEntranceLevelFromDwelling,
  parseAddressString,
} from "../normalizeAiOutputs";

describe("normalizeEntranceLevelFromDwelling", () => {
  it("maps ground-floor dwellings to Ground Floor", () => {
    expect(normalizeEntranceLevelFromDwelling("Ground-floor flat")).toBe(
      "Ground Floor",
    );
  });

  it("maps mid/top/upper floors to Upper Floor", () => {
    expect(normalizeEntranceLevelFromDwelling("Mid-floor flat")).toBe(
      "Upper Floor",
    );
    expect(normalizeEntranceLevelFromDwelling("Top-floor flat")).toBe(
      "Upper Floor",
    );
    expect(normalizeEntranceLevelFromDwelling("3rd floor flat")).toBe(
      "Upper Floor",
    );
  });

  it("maps basement / lower ground to Basement", () => {
    expect(normalizeEntranceLevelFromDwelling("Basement flat")).toBe("Basement");
    expect(normalizeEntranceLevelFromDwelling("Lower ground flat")).toBe(
      "Basement",
    );
  });

  it("maps houses and bungalows to Ground Floor (entrance at grade)", () => {
    expect(normalizeEntranceLevelFromDwelling("Detached house")).toBe(
      "Ground Floor",
    );
    expect(normalizeEntranceLevelFromDwelling("Semi-detached bungalow")).toBe(
      "Ground Floor",
    );
    expect(normalizeEntranceLevelFromDwelling("Mid-terrace house")).toBe(
      "Ground Floor",
    );
  });

  it("returns null for empty or unknown values", () => {
    expect(normalizeEntranceLevelFromDwelling("")).toBeNull();
    expect(normalizeEntranceLevelFromDwelling(null)).toBeNull();
    expect(normalizeEntranceLevelFromDwelling("spaceship")).toBeNull();
  });
});

describe("parseAddressString", () => {
  it("splits a leading door number from the street", () => {
    expect(parseAddressString("12, Baker Street, London")).toEqual({
      doorNo: "12",
      street: "Baker Street",
    });
  });

  it("handles an inline number + street in the first part", () => {
    expect(parseAddressString("221B Baker Street, London")).toEqual({
      doorNo: "221B",
      street: "Baker Street",
    });
  });

  it("treats a leading non-numeric part as a building name", () => {
    expect(parseAddressString("Skyline Towers, High Road, Leeds")).toEqual({
      buildingName: "Skyline Towers",
      street: "High Road",
    });
  });

  it("returns an empty object for blank input", () => {
    expect(parseAddressString("")).toEqual({});
    expect(parseAddressString(null)).toEqual({});
  });
});
