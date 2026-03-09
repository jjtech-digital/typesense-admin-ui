import Link from "next/link";
import { Database, Key, Activity, ArrowRight } from "lucide-react";

interface QuickActionsProps {
  activeConfig: { host: string; port: number; protocol: string } | null;
}

export function QuickActions({ activeConfig }: QuickActionsProps) {
  const quickLinks = [
    {
      href: "/collections",
      label: "Manage Collections",
      description: "View, create, and delete collections",
      icon: <Database className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-50 group-hover:bg-blue-100",
    },
    {
      href: "/keys",
      label: "API Keys",
      description: "Manage search and admin API keys",
      icon: <Key className="h-5 w-5" />,
      color: "text-orange-600 bg-orange-50 group-hover:bg-orange-100",
    },
    {
      href: "/settings",
      label: "Connection Settings",
      description: "Configure your Typesense connection",
      icon: <Activity className="h-5 w-5" />,
      color: "text-gray-600 bg-gray-50 group-hover:bg-gray-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-5">
        Quick Actions
      </h3>
      <div className="space-y-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${link.color}`}
            >
              {link.icon}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm group-hover:text-brand transition-colors">
                {link.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Connection info */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Connection</p>
        {activeConfig ? (
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              Host:{" "}
              <span className="font-mono">
                {activeConfig.host}:{activeConfig.port}
              </span>
            </p>
            <p>
              Protocol:{" "}
              <span className="font-mono">{activeConfig.protocol}</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Not connected —{" "}
            <Link href="/login" className="text-brand hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
