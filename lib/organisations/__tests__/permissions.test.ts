import { describe, expect, it } from "vitest";
import { hasPermission } from "@/types/accesscheck";
import type { OrganisationContext } from "@/types/accesscheck";

type PermissionContext = Pick<
  OrganisationContext,
  "permissions" | "isPlatformAdmin"
>;

describe("organisation permissions", () => {
  it("keeps baseline members read-only", () => {
    const viewer: PermissionContext = {
      permissions: [],
      isPlatformAdmin: false,
    };
    expect(hasPermission(viewer, "author")).toBe(false);
    expect(hasPermission(viewer, "reviewer")).toBe(false);
    expect(hasPermission(viewer, "admin")).toBe(false);
  });

  it("treats organisation roles as additive", () => {
    const authorReviewer: PermissionContext = {
      permissions: ["author", "reviewer"],
      isPlatformAdmin: false,
    };
    expect(hasPermission(authorReviewer, "author")).toBe(true);
    expect(hasPermission(authorReviewer, "reviewer")).toBe(true);
    expect(hasPermission(authorReviewer, "admin")).toBe(false);
  });

  it("allows platform administrators to operate across organisation roles", () => {
    const platformAdmin: PermissionContext = {
      permissions: [],
      isPlatformAdmin: true,
    };
    expect(hasPermission(platformAdmin, "author")).toBe(true);
    expect(hasPermission(platformAdmin, "reviewer")).toBe(true);
    expect(hasPermission(platformAdmin, "admin")).toBe(true);
  });
});
