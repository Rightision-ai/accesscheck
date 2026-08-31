import Link from "next/link";

const links = [
  ["/settings/profile", "Profile"],
  ["/settings/organisation", "Organisation"],
  ["/settings/members", "Members"],
  ["/settings/rate-card", "Rate card"],
  ["/settings/account", "Account"],
] as const;

export default function SettingsNav() {
  return <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Settings navigation">{links.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary">{label}</Link>)}</nav>;
}
