"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { IdleTimer } from "./IdleTimer";

const NO_SIDEBAR_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = NO_SIDEBAR_ROUTES.includes(pathname);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <IdleTimer />
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}
