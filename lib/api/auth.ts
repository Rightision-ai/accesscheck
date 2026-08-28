import { NextResponse } from "next/server";
import { requireOrganisationContext } from "@/lib/organisations/access";
import { hasPermission } from "@/types/accesscheck";
import type { OrganisationContext, OrganisationPermission } from "@/types/accesscheck";

export async function requireApiContext(
  permission?: OrganisationPermission,
): Promise<OrganisationContext | NextResponse> {
  try {
    const context = await requireOrganisationContext();
    if (permission && !hasPermission(context, permission)) {
      return NextResponse.json({ error: `The ${permission} permission is required.` }, { status: 403 });
    }
    if (context.organisationStatus !== "active" && permission) {
      return NextResponse.json({ error: "This organisation is not active." }, { status: 403 });
    }
    return context;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not authenticated." },
      { status: 401 },
    );
  }
}

export function isApiError(value: OrganisationContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
