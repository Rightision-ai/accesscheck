"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  {
    href: "/property-check",
    label: "Check a Property",
    match: (p: string) => p === "/property-check",
  },
  {
    // Bulk Check goes straight to the upload page (sample + CSV upload on one screen).
    href: "/property-check/upload",
    label: "Bulk Check",
    match: (p: string) =>
      p.startsWith("/property-check/upload") ||
      p.startsWith("/property-check/jobs"),
  },
  {
    href: "/property-check/survey-priority",
    label: "Property List",
    match: (p: string) => p.startsWith("/property-check/survey-priority"),
  },
];

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 -mb-px">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
              active
                ? "text-primary border-primary"
                : "text-slate-600 border-transparent hover:text-primary hover:border-primary/40",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
