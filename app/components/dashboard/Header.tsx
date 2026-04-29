"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, User, PlusCircle, LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

interface HeaderProps {
  user: { name: string; role: string } | null;
  onOpenWizard: () => void;
  onSearch: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenWizard, onSearch }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="min-h-16 md:h-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-3 sticky top-0 z-[100] border-b border-[var(--glass-border)] bg-white">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <img
          src="/header-logo.png"
          alt="AccessCheck"
          className="h-9 sm:h-[72px] cursor-pointer"
        />
      </div>

      {/* Desktop: Search bar */}
      <div className="flex-1 min-w-0 order-last md:order-none w-full md:w-auto md:max-w-[500px] md:mx-4 lg:mx-10 hidden md:block">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-text-dim shrink-0"
          />
          <input
            type="text"
            placeholder="Search address, ID or client..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full py-2.5 md:py-3 px-3 md:px-4 pl-10 md:pl-12 rounded-lg md:rounded-xl text-text-main text-sm outline-none border border-gray-200 bg-white/80 backdrop-blur"
          />
        </div>
      </div>

      {/* Desktop: Actions */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
        {/* New Assessment - desktop only */}
        <button
          onClick={onOpenWizard}
          className="hidden md:flex py-2 px-3 sm:px-4 rounded-lg md:rounded-[10px] items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-all border border-gray-200 cursor-pointer bg-white/80 backdrop-blur hover:border-primary hover:bg-primary-light"
        >
          <PlusCircle
            size={16}
            className="sm:w-[18px] sm:h-[18px] text-primary shrink-0"
          />
          <span>New Assessment</span>
        </button>
        <Bell
          size={18}
          className="hidden md:block sm:w-5 sm:h-5 text-slate-400 cursor-pointer shrink-0"
        />
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden lg:block">
            <div className="text-xs font-extrabold text-slate-900 truncate max-w-[120px]">
              {user?.name || "User"}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">
              {user?.role || "OT"}
            </div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg md:rounded-xl bg-primary text-white flex items-center justify-center text-xs sm:text-sm font-extrabold cursor-pointer shadow-[0_4px_12px_rgba(15,183,91,0.3)] shrink-0">
            {user?.name ? (
              user.name.charAt(0)
            ) : (
              <User size={18} className="sm:w-5 sm:h-5" />
            )}
          </div>
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="bg-transparent border-none cursor-pointer text-slate-400 flex items-center p-1 shrink-0"
          >
            <LogOut size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Mobile: Hamburger menu */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-2 rounded-lg border border-gray-200 bg-white/80 cursor-pointer hover:border-primary hover:bg-primary-light transition-all"
            aria-label="Open menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg py-3 z-[110]">
              <div className="px-4 pb-3 border-b border-gray-100">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
                  />
                  <input
                    type="text"
                    placeholder="Search address, ID or client..."
                    onChange={(e) => onSearch && onSearch(e.target.value)}
                    className="w-full py-2.5 px-3 pl-10 rounded-lg text-text-main text-sm outline-none border border-gray-200"
                  />
                </div>
              </div>
              <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left">
                <Bell size={20} className="text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700">
                  Notifications
                </span>
              </button>
              <div className="px-4 py-3 flex items-center gap-3 border-t border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                  {user?.name ? user.name.charAt(0) : <User size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {user?.name || "User"}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    {user?.role || "OT"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left border-t border-gray-100"
              >
                <LogOut size={20} className="text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700">
                  Sign Out
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
