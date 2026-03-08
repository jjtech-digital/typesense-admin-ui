"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, Server, LogOut } from "lucide-react";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { maskApiKey } from "@/lib/utils";

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
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
  const { getConfig, logout } = useConnectionConfig();
  const [showServerInfo, setShowServerInfo] = useState(false);
  const [config, setConfig] = useState<ReturnType<typeof getConfig>>(null);

  useEffect(() => {
    setConfig(getConfig());
  }, [getConfig]);

  const baseUrl = config
    ? (() => {
        const isDefault =
          (config.protocol === "https" && config.port === 443) ||
          (config.protocol === "http" && config.port === 80);
        return `${config.protocol}://${config.host}${isDefault ? "" : `:${config.port}`}`;
      })()
    : null;

  return (
    <header className="bg-white border-b border-gray-200 pl-14 pr-4 sm:px-6 lg:pl-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20 gap-3">
      {/* Left: title + breadcrumbs */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
        {crumbs.length > 1 && (
          <nav className="flex items-center gap-1 mt-0.5">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && <span className="text-gray-300 text-xs">/</span>}
                <span className={`text-xs ${i === crumbs.length - 1 ? "text-gray-500" : "text-gray-400"}`}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Right: connected server + actions */}
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        )}

        {/* Connected server indicator */}
        {config && baseUrl && (
          <div className="relative">
            <button
              onClick={() => setShowServerInfo((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
              title="Connected server info"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <Server className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700 max-w-[180px] truncate">
                {config.host}
              </span>
            </button>

            {/* Dropdown */}
            {showServerInfo && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowServerInfo(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Connected Server
                  </p>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">URL</span>
                      <span className="text-gray-800 truncate ml-2 max-w-[160px]">{baseUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Protocol</span>
                      <span className="text-gray-800">{config.protocol.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Port</span>
                      <span className="text-gray-800">{config.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">API Key</span>
                      <span className="text-gray-800">{maskApiKey(config.apiKey)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">
                      Stored only in your browser. Never sent to any third-party.
                    </p>
                    <button
                      onClick={() => { setShowServerInfo(false); logout("manual"); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
