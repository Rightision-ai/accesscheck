import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import OrganisationForm from "./OrganisationForm";

export default async function OrganisationSettingsPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  if (!context.isPlatformAdmin && !context.permissions.includes("admin")) redirect("/settings/profile");
  const db = asLooseClient(await createClient());
  const result = await db.from("organisations").select("*").eq("id", context.organisationId).single();
  return <OrganisationForm initial={result.data as never} organisationId={context.organisationId} />;
}
