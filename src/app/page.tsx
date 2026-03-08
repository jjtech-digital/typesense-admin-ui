import Link from "next/link";
import {
  Database,
  Key,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cookies } from "next/headers";
import {
  getTypesenseClient,
  getTypesenseClientFromConfig,
} from "@/lib/typesense";
import {
  formatNumber,
  CONNECTION_CONFIG_COOKIE,
  getConnectionConfigFromCookies,
} from "@/lib/utils";
import type { TypesenseCollection } from "@/types/typesense";
import { Header } from "@/components/layout/Header";

async function getDashboardData() {
  try {
    const cookieStore = await cookies();
    const cookieStr = cookieStore.get(CONNECTION_CONFIG_COOKIE)?.value ?? null;
    const config = getConnectionConfigFromCookies(
      cookieStr ? decodeURIComponent(cookieStr) : null
    );
    const client = config
      ? getTypesenseClientFromConfig(config)
      : getTypesenseClient();
    const [health, collections, keys] = await Promise.allSettled([
      client.health.retrieve(),
      client.collections().retrieve(),
      client.keys().retrieve(),
    ]);

    const healthData =
      health.status === "fulfilled" ? health.value : { ok: false };
    const collectionsData: TypesenseCollection[] =
      collections.status === "fulfilled"
        ? (collections.value as TypesenseCollection[])
        : [];
    const keysData =
      keys.status === "fulfilled" ? keys.value : { keys: [] };

    const totalDocuments = collectionsData.reduce(
      (sum, c) => sum + (c.num_documents || 0),
      0
    );

    return {
      health: healthData,
      collections: collectionsData,
      totalDocuments,
      totalKeys: Array.isArray(keysData.keys) ? keysData.keys.length : 0,
      error: null,
    };
  } catch (error) {
    return {
      health: { ok: false },
      collections: [],
      totalDocuments: 0,
      totalKeys: 0,
      error: error instanceof Error ? error.message : "Failed to connect",
    };
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieStr = cookieStore.get(CONNECTION_CONFIG_COOKIE)?.value ?? null;
  const activeConfig = getConnectionConfigFromCookies(
    cookieStr ? decodeURIComponent(cookieStr) : null
  );
  const displayHost = activeConfig?.host ?? process.env.TYPESENSE_HOST ?? "localhost";
  const displayPort = activeConfig?.port ?? process.env.TYPESENSE_PORT ?? "8108";
  const displayProtocol = activeConfig?.protocol ?? process.env.TYPESENSE_PROTOCOL ?? "http";

  const { health, collections, totalDocuments, totalKeys, error } =
    await getDashboardData();

  const stats = [
    {
      label: "Server Status",
      value: health.ok ? "Healthy" : "Unreachable",
      icon: health.ok ? (
        <CheckCircle className="h-6 w-6 text-green-500" />
      ) : (
        <XCircle className="h-6 w-6 text-red-500" />
      ),
      color: health.ok
        ? "bg-green-50 border-green-200"
        : "bg-red-50 border-red-200",
      textColor: health.ok ? "text-green-700" : "text-red-700",
    },
    {
      label: "Collections",
      value: collections.length.toString(),
      icon: <Database className="h-6 w-6 text-blue-500" />,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      href: "/collections",
    },
    {
      label: "Total Documents",
      value: formatNumber(totalDocuments),
      icon: <FileText className="h-6 w-6 text-purple-500" />,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
    },
    {
      label: "API Keys",
      value: totalKeys.toString(),
      icon: <Key className="h-6 w-6 text-orange-500" />,
      color: "bg-orange-50 border-orange-200",
      textColor: "text-orange-700",
      href: "/keys",
    },
  ];

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
    <div>
      <Header />
      <div className="p-6 space-y-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-sidebar to-sidebar-active rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
            <Zap className="h-32 w-32" />
          </div>
          <div className="relative">
            <h2 className="text-2xl font-bold mb-1">
              Welcome to Typesense Admin
            </h2>
            <p className="text-gray-300 text-sm">
              Manage your search collections, documents, synonyms, and API keys
              from one place.
            </p>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-300 text-sm bg-red-900/20 px-3 py-2 rounded-lg w-fit">
                <XCircle className="h-4 w-4" />
                {error} — check your connection in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-5 ${stat.color} ${
                "href" in stat ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${stat.textColor}`}>
                  {stat.label}
                </span>
                {stat.icon}
              </div>
              <p className={`text-3xl font-bold ${stat.textColor}`}>
                {stat.value}
              </p>
              {"href" in stat && stat.href && (
                <Link
                  href={stat.href}
                  className={`mt-2 text-xs ${stat.textColor} flex items-center gap-1 hover:underline`}
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Collections */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                Recent Collections
              </h3>
              <Link
                href="/collections"
                className="text-sm text-brand hover:text-brand-hover flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Database className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No collections yet</p>
                <Link
                  href="/collections"
                  className="mt-2 text-sm text-brand hover:underline"
                >
                  Create your first collection
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {collections.slice(0, 6).map((collection) => (
                  <Link
                    key={collection.name}
                    href={`/collections/${collection.name}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Database className="h-4 w-4 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-brand truncate">
                        {collection.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {collection.fields.length} fields
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatNumber(collection.num_documents)}
                      </p>
                      <p className="text-xs text-gray-500">docs</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
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
              <p className="text-xs font-medium text-gray-500 mb-2">
                Connection
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  Host:{" "}
                  <span className="font-mono">
                    {displayHost}:{displayPort}
                  </span>
                </p>
                <p>
                  Protocol:{" "}
                  <span className="font-mono">{displayProtocol}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
