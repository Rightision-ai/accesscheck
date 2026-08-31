import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationContext } from "@/lib/organisations/access";
import {
  loadRateCardForOrganisation,
  loadRateCardVersions,
} from "@/lib/rate-cards/repository";
import RateCardTable from "./RateCardTable";
import RateCardUpload from "./RateCardUpload";
import RateCardVersions from "./RateCardVersions";

/**
 * The rates that price every adaptation plan.
 *
 * Every organisation starts on the national indicative card and keeps it as the floor: an
 * uploaded schedule of rates overrides the work items it prices and leaves the rest inherited,
 * so nothing needs seeding when a council is created and nobody can lose coverage by uploading
 * a partial file.
 */
export default async function RateCardSettingsPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");

  const supabase = await createClient();
  const canManage =
    context.isPlatformAdmin || context.permissions.includes("admin");

  const [rateCard, versions] = await Promise.all([
    loadRateCardForOrganisation(supabase, context.organisationId),
    loadRateCardVersions(supabase, context.organisationId),
  ]);

  return (
    <div className="space-y-6">
      <RateCardUpload canManage={canManage} currentLabel={rateCard.label} />
      <RateCardVersions versions={versions} canManage={canManage} />
      <RateCardTable rateCard={rateCard} />
    </div>
  );
}
