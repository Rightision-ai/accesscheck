"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Camera,
  Ruler,
  Wrench,
  FileText,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const SOLUTIONS = [
  {
    href: "/solutions/floor-plan-analysis",
    icon: Ruler,
    title: "Floor plan analysis",
    description:
      "Doorway widths, turning circles and level access from any plan.",
  },
  {
    href: "/solutions/image-analysis",
    icon: Camera,
    title: "Image analysis",
    description:
      "Detect grab rails, thresholds and hazards from existing photos.",
  },
  {
    href: "/solutions/adaptation-plans",
    icon: Wrench,
    title: "Adaptation plans",
    description: "Costed, budget-aware adaptations grounded in standards.",
  },
  {
    href: "/solutions/reports",
    icon: FileText,
    title: "DFG-ready reports",
    description: "Defensible PDFs with linked photo evidence per finding.",
  },
  {
    href: "/solutions/dfg",
    icon: BadgeCheck,
    title: "Disabled Facilities Grant",
    description:
      "Help applicants prepare faster, better-evidenced submissions.",
  },
];

export default function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[var(--border)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-6">
          <Link
            href="/"
            aria-label="AccessCheck home"
            className="flex items-center shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-dark)] focus-visible:ring-offset-2"
          >
            <Image
              src="/assets/logo/SVG/AcessCheck -29.svg"
              alt="AccessCheck"
              width={200}
              height={56}
              priority
              className="h-10 md:h-14 w-auto object-contain"
            />
          </Link>

          <NavigationMenu className="hidden md:flex" aria-label="Primary">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[640px] grid-cols-2 gap-2 p-4">
                  {SOLUTIONS.map(({ icon: Icon, ...item }) => (
                    <li key={item.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--primary-light)] focus-visible:outline-none focus-visible:bg-[var(--primary-light)]"
                        >
                          <span className="grid place-items-center w-10 h-10 rounded-lg bg-[var(--primary-light)] text-[var(--primary-dark)] shrink-0 group-hover:bg-white">
                            <Icon size={20} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-dark)]">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--text-dim)] leading-snug">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/about" className={navigationMenuTriggerStyle()}>
                  About
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href="/about#contact-heading"
                  className={navigationMenuTriggerStyle()}
                >
                  Contact
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="primary"
            size="md"
            className="hidden md:inline-flex"
          >
            <Link href="/login">
              Login
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Mobile"
                className="px-6 py-4 flex flex-col gap-1"
              >
                <p className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                  Solutions
                </p>
                {SOLUTIONS.map(({ icon: Icon, ...item }) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-start gap-3 rounded-md px-2 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)]"
                  >
                    <Icon
                      size={18}
                      className="mt-0.5 text-[var(--primary-dark)] shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-semibold">{item.title}</span>
                    </span>
                  </Link>
                ))}
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 px-2 py-2 rounded-md text-sm font-medium text-[var(--text-main)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)]"
                >
                  About
                </Link>
                <Link
                  href="/about#contact-heading"
                  onClick={() => setMobileOpen(false)}
                  className="px-2 py-2 rounded-md text-sm font-medium text-[var(--text-main)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)]"
                >
                  Contact
                </Link>
                <Button asChild variant="primary" size="md" className="mt-4">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Login
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
