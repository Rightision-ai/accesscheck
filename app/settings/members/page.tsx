import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import SettingsNav from "@/app/components/settings/SettingsNav";
import MembersClient from "./MembersClient";

export default async function MembersSettingsPage() { const context = await getOrganisationContext(); if (!context) redirect("/login"); const db = asLooseClient(await createClient()); const [members, invitations] = await Promise.all([db.from("organisation_members").select("*,organisation_member_permissions(permission)").eq("organisation_id", context.organisationId).order("created_at", { ascending: true }), db.from("organisation_invitations").select("id,email,permissions,status,expires_at,created_at").eq("organisation_id", context.organisationId).order("created_at", { ascending: false })]); return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6"><h1 className="text-3xl font-extrabold text-slate-950">Settings</h1><p className="mb-6 mt-1 text-sm text-slate-500">Manage your AccessCheck account and council workspace.</p><SettingsNav /><MembersClient initialMembers={(members.data ?? []) as never[]} initialInvitations={(invitations.data ?? []) as never[]} canAdmin={context.isPlatformAdmin || context.permissions.includes("admin")} /></div>; }
