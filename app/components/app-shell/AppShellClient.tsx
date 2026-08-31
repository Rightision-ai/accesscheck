"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

type Props = {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string | null;
  organisationName: string;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
};

export default function AppShellClient({ children, userName, avatarUrl, organisationName, isAdmin, isPlatformAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const [search, setSearch] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const roleLabel = isAdmin ? "Organisation admin" : "Council member";
  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountMenuOpen]);

  const sidebar = (collapsed = false) => (
    <div className="flex h-full flex-col bg-white">
      <div className={cn("flex h-20 items-center border-b border-slate-200", collapsed ? "justify-center px-3" : "px-5")}>
        <Link href="/dashboard" aria-label="AccessCheck overview">
          <Image
            src={collapsed ? "/logo.png" : "/assets/logo/PNG/AcessCheck -21.png"}
            alt="AccessCheck"
            width={collapsed ? 42 : 180}
            height={collapsed ? 42 : 64}
            className={collapsed ? "h-10 w-10 object-contain" : "h-12 w-auto"}
            priority
          />
        </Link>
      </div>
      {!collapsed && <div className="px-4 py-4"><p className="truncate text-xs font-semibold text-slate-500">{organisationName}</p></div>}
      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center rounded-xl py-2.5 text-sm font-semibold transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active ? "bg-primary-light text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      {/* Settings and sign-out live in the header avatar menu; only platform admin remains pinned here. */}
      {isPlatformAdmin && (
        <div className="border-t border-slate-200 p-3">
          <Link href="/platform/organisations" onClick={() => setMobileOpen(false)} title={collapsed ? "Platform administration" : undefined} className={cn("flex items-center rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50", collapsed ? "justify-center px-2" : "gap-3 px-3")}>
            <Building2 size={18} /> {!collapsed && "Platform administration"}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 transition-[width] duration-200 lg:block", desktopCollapsed ? "w-20" : "w-64")}>
        {sidebar(desktopCollapsed)}
        <button
          type="button"
          onClick={() => setDesktopCollapsed((value) => !value)}
          className="absolute -right-3 top-7 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-primary hover:text-primary"
          aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {desktopCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/30" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="relative h-full w-72 border-r border-slate-200 bg-white">
            <button className="absolute right-3 top-3 rounded-lg p-2 text-slate-500" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X size={20} />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}
      <div className={cn("transition-[padding] duration-200", desktopCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        {/* Equal flex-1 side groups keep the search centred in the header whatever the user block's width. */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
          </div>
          <form
            className="relative w-full min-w-0 max-w-xl flex-[2]"
            onSubmit={(event) => {
              event.preventDefault();
              if (search.trim()) router.push(`/assessments?search=${encodeURIComponent(search.trim())}`);
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search address, reference or applicant"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-primary focus:bg-white"
            />
          </form>
          <div className="relative flex min-w-0 flex-1 justify-end" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label={`Account menu for ${userName}`}
              className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-slate-100"
            >
              <span className="hidden min-w-0 text-right sm:block">
                <span className="block max-w-44 truncate text-sm font-semibold text-slate-900">{userName}</span>
                <span className="block text-xs text-slate-500">{roleLabel}</span>
              </span>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-supplied storage URL, no loader config
                <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {initials}
                </span>
              )}
              <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", accountMenuOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {accountMenuOpen && (
              <div role="menu" aria-label="Account" className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{roleLabel} · {organisationName}</p>
                </div>
                <Link
                  href="/settings/profile"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={17} aria-hidden="true" /> Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setAccountMenuOpen(false); signOut(); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={17} aria-hidden="true" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
