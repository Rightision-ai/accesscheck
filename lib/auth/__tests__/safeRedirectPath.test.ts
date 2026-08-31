import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("accepts same-origin paths, which is the whole point — invitation links", () => {
    expect(safeRedirectPath("/invite/abc123")).toBe("/invite/abc123");
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/settings/profile")).toBe("/settings/profile");
  });

  it("rejects protocol-relative URLs — the classic open-redirect bypass", () => {
    expect(safeRedirectPath("//evil.com")).toBeNull();
    expect(safeRedirectPath("//evil.com/path")).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBeNull();
    expect(safeRedirectPath("http://evil.com/x")).toBeNull();
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects anything that is not a rooted path", () => {
    expect(safeRedirectPath("dashboard")).toBeNull();
    expect(safeRedirectPath("")).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath(42)).toBeNull();
    // FormData.get() returns a File for file inputs; must not be trusted.
    expect(safeRedirectPath({ toString: () => "/dashboard" })).toBeNull();
  });
});
