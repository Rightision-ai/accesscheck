"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/settings/profile", label: "Profile", adminOnly: false },
  { href: "/settings/organisation", label: "Organisation", adminOnly: true },
  { href: "/settings/members", label: "Members", adminOnly: true },
  { href: "/settings/schedule-of-rates", label: "Schedule of rates", adminOnly: false },
  { href: "/settings/account", label: "Account", adminOnly: false },
] as const;

/** Spinner shown on the link being navigated to. Must live inside <Link>. */
function PendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 size={14} className="animate-spin" aria-hidden="true" />;
}

export default function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
      aria-label="Settings navigation"
    >
      {links
        .filter((link) => isAdmin || !link.adminOnly)
        .map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                active
                  ? "bg-primary-light text-primary"
                  : "text-slate-600 hover:bg-slate-50 hover:text-primary",
              )}
            >
              {link.label}
              <PendingIndicator />
            </Link>
          );
        })}
    </nav>
  );
}
