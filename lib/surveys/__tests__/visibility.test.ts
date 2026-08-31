import { describe, expect, it } from "vitest";
import { applySurveyVisibility, canViewAllSurveys } from "@/lib/surveys/visibility";

const base = { userId: "user-1", isPlatformAdmin: false };

describe("canViewAllSurveys", () => {
  it("keeps a plain author to their own cases", () => {
    expect(canViewAllSurveys({ permissions: ["author"], isPlatformAdmin: false })).toBe(false);
  });

  it("gives reviewers the full list — they approve other people's work", () => {
    expect(canViewAllSurveys({ permissions: ["reviewer"], isPlatformAdmin: false })).toBe(true);
    expect(canViewAllSurveys({ permissions: ["author", "reviewer"], isPlatformAdmin: false })).toBe(true);
  });

  it("gives admins the full list", () => {
    expect(canViewAllSurveys({ permissions: ["admin"], isPlatformAdmin: false })).toBe(true);
  });

  it("gives platform admins the full list regardless of organisation grants", () => {
    expect(canViewAllSurveys({ permissions: [], isPlatformAdmin: true })).toBe(true);
  });

  it("treats a member with no permissions as not seeing everything", () => {
    expect(canViewAllSurveys({ permissions: [], isPlatformAdmin: false })).toBe(false);
  });
});

describe("applySurveyVisibility", () => {
  /** Records the `.eq()` calls a PostgREST builder would receive. */
  const builder = () => {
    const calls: Array<[string, string]> = [];
    const self = {
      calls,
      eq(column: string, value: string) {
        calls.push([column, value]);
        return self;
      },
    };
    return self;
  };

  it("filters an author down to their own rows", () => {
    const query = builder();
    applySurveyVisibility(query, { ...base, permissions: ["author"] });
    expect(query.calls).toEqual([["user_id", "user-1"]]);
  });

  it("is a no-op for anyone who can see everything", () => {
    for (const context of [
      { ...base, permissions: ["admin" as const] },
      { ...base, permissions: ["reviewer" as const] },
      { ...base, permissions: [], isPlatformAdmin: true },
    ]) {
      const query = builder();
      applySurveyVisibility(query, context);
      expect(query.calls).toEqual([]);
    }
  });

  it("returns the same builder so it can be chained", () => {
    const query = builder();
    expect(applySurveyVisibility(query, { ...base, permissions: ["author"] })).toBe(query);
  });
});
