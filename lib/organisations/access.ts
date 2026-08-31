import "server-only";

import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import type {
  OrganisationContext,
  OrganisationPermission,
  OrganisationStatus,
} from "@/types/accesscheck";

type MemberRow = {
  id: string;
  organisation_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type OrganisationRow = {
  id: string;
  name: string;
  status: OrganisationStatus;
};

export async function getOrganisationContext(): Promise<OrganisationContext | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const db = asLooseClient(supabase);
  const [platformResult, memberResult] = await Promise.all([
    db.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    db
      .from("organisation_members")
      .select("id,organisation_id,first_name,last_name,avatar_url")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const member = memberResult.data as MemberRow | null;
  if (!member) return null;

  const [organisationResult, permissionsResult] = await Promise.all([
    db.from("organisations").select("id,name,status").eq("id", member.organisation_id).single(),
    db.from("organisation_member_permissions").select("permission").eq("member_id", member.id),
  ]);
  if (organisationResult.error || !organisationResult.data) return null;

  const organisation = organisationResult.data as OrganisationRow;
  const permissions = ((permissionsResult.data ?? []) as Array<{ permission: OrganisationPermission }>).map(
    (row) => row.permission,
  );

  return {
    userId: user.id,
    organisationId: organisation.id,
    organisationName: organisation.name,
    organisationStatus: organisation.status,
    memberId: member.id,
    firstName: member.first_name,
    lastName: member.last_name,
    avatarUrl: member.avatar_url,
    permissions,
    isPlatformAdmin: Boolean(platformResult.data),
  };
}

export async function requireOrganisationContext(): Promise<OrganisationContext> {
  const context = await getOrganisationContext();
  if (!context) throw new Error("You do not have an active organisation membership.");
  return context;
}
