import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import MembersClient from "./MembersClient";

export default async function MembersSettingsPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  if (!context.isPlatformAdmin && !context.permissions.includes("admin")) redirect("/settings/profile");
  const db = asLooseClient(await createClient());
  const [members, invitations] = await Promise.all([
    db.from("organisation_members").select("*,organisation_member_permissions(permission)").eq("organisation_id", context.organisationId).order("created_at", { ascending: true }),
    db.from("organisation_invitations").select("id,email,permissions,status,expires_at,created_at").eq("organisation_id", context.organisationId).order("created_at", { ascending: false }),
  ]);
  return <MembersClient initialMembers={(members.data ?? []) as never[]} initialInvitations={(invitations.data ?? []) as never[]} />;
}
