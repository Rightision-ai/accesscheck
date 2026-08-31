import { redirect } from "next/navigation";
import AuthenticatedAppShell from "@/app/components/app-shell/AuthenticatedAppShell";
import SettingsNav from "@/app/components/settings/SettingsNav";
import { getOrganisationContext } from "@/lib/organisations/access";

/**
 * Owns the settings chrome — heading and tab bar — so the nav stays mounted
 * across tab navigations. That is what lets the active tab highlight update
 * immediately while `loading.tsx` renders the incoming page.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await getOrganisationContext();
  if (!context) redirect("/login");
  const isAdmin = context.isPlatformAdmin || context.permissions.includes("admin");
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <h1 className="text-3xl font-extrabold text-slate-950">Settings</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Manage your AccessCheck account and council workspace.</p>
        <SettingsNav isAdmin={isAdmin} />
        {children}
      </div>
    </AuthenticatedAppShell>
  );
}
