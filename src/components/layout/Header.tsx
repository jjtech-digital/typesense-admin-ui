"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
  ];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label =
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  const last = segments[segments.length - 1];

  if (segments[0] === "collections") {
    if (segments.length === 1) return "Collections";
    if (segments.length === 2) return `Collection: ${segments[1]}`;
    if (segments[2] === "synonyms") return `Synonyms — ${segments[1]}`;
    if (segments[2] === "overrides") return `Overrides — ${segments[1]}`;
  }

  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {crumbs.length > 1 && (
          <nav className="flex items-center gap-1 mt-0.5">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <span className="text-gray-300 text-xs">/</span>
                )}
                <span
                  className={`text-xs ${
                    i === crumbs.length - 1
                      ? "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
    </header>
  );
}
