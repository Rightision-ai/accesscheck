import { Building2, LogOut, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut, getUser } from "@/lib/auth/actions";
import { getOrganisationContext } from "@/lib/organisations/access";

export default async function NoOrganisationPage() {
  const [user, context] = await Promise.all([getUser(), getOrganisationContext()]);
  if (!user) redirect("/login");
  if (context) redirect("/dashboard");

  async function handleSignOut(): Promise<void> {
    "use server";
    await signOut();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-primary">
          <Building2 size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
          Council access is not assigned
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You are signed in as <strong>{user.email}</strong>, but this account is not an active
          member of a council workspace.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Ask your council administrator to invite this email address. If you already have an
          invitation, open its acceptance link and then return to AccessCheck.
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="mailto:Shahin@homingo.co.uk"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            <Mail size={16} /> Contact support
          </a>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
