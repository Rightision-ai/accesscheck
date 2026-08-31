import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { getOrganisationContext } from "@/lib/organisations/access";
import AppShellClient from "./AppShellClient";

export default async function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const [user, context] = await Promise.all([getUser(), getOrganisationContext()]);
  if (!user) redirect("/login");
  if (!context) redirect("/no-organisation");
  const memberName = [context.firstName, context.lastName].filter(Boolean).join(" ");
  return (
    <AppShellClient
      userName={memberName || String(user.user_metadata?.full_name || user.email || "User")}
      avatarUrl={context.avatarUrl}
      organisationName={context.organisationName}
      isAdmin={context.isPlatformAdmin || context.permissions.includes("admin")}
      isPlatformAdmin={context.isPlatformAdmin}
    >
      {children}
    </AppShellClient>
  );
}
