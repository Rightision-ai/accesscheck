import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import PlatformOrganisationsClient from "./PlatformOrganisationsClient";

export default async function PlatformOrganisationsPage() { const context = await getOrganisationContext(); if (!context?.isPlatformAdmin) redirect("/dashboard"); const db = asLooseClient(await createClient()); const result = await db.from("organisations").select("*").order("name", { ascending: true }); return <PlatformOrganisationsClient initial={(result.data ?? []) as never[]} />; }
