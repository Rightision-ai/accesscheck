import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asLooseClient } from "@/lib/supabase/loose";
import { getOrganisationContext } from "@/lib/organisations/access";
import ProfileForm from "./ProfileForm";

export default async function ProfileSettingsPage() {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const db = asLooseClient(supabase);
  const member = await db
    .from("organisation_members")
    .select("first_name,last_name,job_title,phone,avatar_url")
    .eq("id", context.memberId)
    .single();
  return <ProfileForm initial={(member.data ?? {}) as never} email={auth.user?.email ?? ""} userId={context.userId} />;
}
