"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/solutions", label: "Overview" },
  { href: "/solutions/floor-plan-analysis", label: "Floor plan" },
  { href: "/solutions/image-analysis", label: "Image" },
  { href: "/solutions/adaptation-plans", label: "Adaptation" },
  { href: "/solutions/reports", label: "Reports" },
  { href: "/solutions/dfg", label: "DFG" },
];

export default function SolutionsNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Solutions sections"
      className="border-b border-[var(--border)] bg-white"
    >
      <ul className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center min-h-11 px-4 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2 ${
                  active
                    ? "border-[var(--primary)] text-[var(--primary-dark)]"
                    : "border-transparent text-[var(--text-main)] hover:text-[var(--primary-dark)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
