import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import { loadReportData } from "@/lib/reports/loadReportData";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const params = await searchParams;
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = typeof params.from === "string" ? params.from : defaultFrom.toISOString().slice(0, 10);

  const db = asLooseClient(await createClient());
  const data = await loadReportData(db, context, { from, to });

  return (
    <ReportsClient
      range={{ from, to }}
      organisationName={context.organisationName}
      summary={data.summary}
      trend={data.trend}
      bands={data.bands}
      cost={data.cost}
      improvements={data.improvements}
      activity={data.activity}
      topMember={data.topMember}
      csvHref={`/api/reports/assessments?${new URLSearchParams({ from, to, format: "csv" })}`}
      isAdmin={data.isAdmin}
    />
  );
}
