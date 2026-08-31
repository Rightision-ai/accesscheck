export type OrganisationPermission = "author" | "reviewer" | "admin";
export type OrganisationStatus = "active" | "suspended" | "expired";
export type AssessmentStatus = "draft" | "review" | "complete";
export type AssessmentReadiness = "ready" | "partial" | "incomplete";

export interface OrganisationContext {
  userId: string;
  organisationId: string;
  organisationName: string;
  organisationStatus: OrganisationStatus;
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  permissions: OrganisationPermission[];
  isPlatformAdmin: boolean;
}

export function hasPermission(
  context: Pick<OrganisationContext, "permissions" | "isPlatformAdmin">,
  permission: OrganisationPermission,
): boolean {
  return context.isPlatformAdmin || context.permissions.includes(permission);
}
