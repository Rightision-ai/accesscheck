import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import SettingsNav from "@/app/components/settings/SettingsNav";
import OrganisationForm from "./OrganisationForm";

export default async function OrganisationSettingsPage() { const context = await getOrganisationContext(); if (!context) redirect("/login"); const db = asLooseClient(await createClient()); const result = await db.from("organisations").select("*").eq("id", context.organisationId).single(); return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6"><h1 className="text-3xl font-extrabold text-slate-950">Settings</h1><p className="mb-6 mt-1 text-sm text-slate-500">Manage your AccessCheck account and council workspace.</p><SettingsNav /><OrganisationForm initial={result.data as never} canEdit={context.isPlatformAdmin || context.permissions.includes("admin")} /></div>; }
