"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Key,
  Settings,
  ChevronRight,
  Zap,
  Menu,
  X,
  GitMerge,
  LogOut,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    exact: true,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    href: "/collections",
    label: "Collections",
    icon: <Database className="h-5 w-5" />,
  },
  {
    href: "/synonyms",
    label: "Synonyms",
    icon: <GitMerge className="h-5 w-5" />,
  },
  {
    href: "/keys",
    label: "API Keys",
    icon: <Key className="h-5 w-5" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { logout } = useConnectionConfig();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const handleLogout = () => {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      // Auto-reset if user doesn't confirm within 3s
      setTimeout(() => setConfirmingLogout(false), 3000);
      return;
    }
    logout("manual");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">Typesense</h1>
          <p className="text-gray-400 text-xs">Admin UI</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Navigation
        </p>
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-gray-400 hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <span
                className={cn(
                  "transition-colors",
                  active ? "text-white" : "text-gray-500 group-hover:text-white"
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4 text-gray-300 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            confirmingLogout
              ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
              : "text-gray-400 hover:bg-sidebar-hover hover:text-white"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-left">
            {confirmingLogout ? "Click again to confirm" : "Log out"}
          </span>
        </button>

        <p className="px-3 pt-1 text-xs text-gray-600">Typesense Admin UI v0.1.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar min-h-screen fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-lg text-white shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 z-40 h-full w-64 bg-sidebar transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
