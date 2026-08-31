import type { OrganisationContext } from "@/types/accesscheck";

/**
 * Who may see every case in the organisation.
 *
 * A plain author sees only the cases they created. Admins see everything, and so
 * do reviewers — their job is approving other people's work, so a reviewer who
 * could not open a colleague's case would be unable to do it.
 *
 * This mirrors the SQL function `public.can_view_all_surveys` (migration
 * 20260905120000). RLS is the real enforcement; this exists so that list and
 * analytics queries return the same rows the policy would allow, otherwise the
 * dashboard counts cases the user cannot open.
 */
export function canViewAllSurveys(
  context: Pick<OrganisationContext, "permissions" | "isPlatformAdmin">,
): boolean {
  return (
    context.isPlatformAdmin ||
    context.permissions.includes("admin") ||
    context.permissions.includes("reviewer")
  );
}

/** The minimal shape of a PostgREST query builder that we chain onto. */
type Filterable<T> = { eq(column: string, value: string): T };

/**
 * Narrow a `surveys` query to the cases the caller may see.
 *
 * Call it on a query that is already scoped to the organisation. For an author
 * it adds `user_id = <caller>`; for anyone who can see everything it is a no-op.
 */
export function applySurveyVisibility<T extends Filterable<T>>(
  query: T,
  context: Pick<OrganisationContext, "permissions" | "isPlatformAdmin" | "userId">,
): T {
  return canViewAllSurveys(context) ? query : query.eq("user_id", context.userId);
}
