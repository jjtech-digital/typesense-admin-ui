import Link from "next/link";
import { Zap, XCircle } from "lucide-react";
import { cookies } from "next/headers";
import { getTypesenseClientFromConfig } from "@/lib/typesense";
import {
  CONNECTION_CONFIG_COOKIE,
  getConnectionConfigFromCookies,
} from "@/lib/utils";
import type { TypesenseCollection } from "@/types/typesense";
import { Header } from "@/components/layout/Header";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RecentCollections } from "@/components/dashboard/RecentCollections";
import { QuickActions } from "@/components/dashboard/QuickActions";

async function getDashboardData(config: {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
} | null) {
  if (!config) {
    return {
      health: { ok: false },
      collections: [] as TypesenseCollection[],
      totalDocuments: 0,
      totalKeys: 0,
      error: "No connection configured",
    };
  }

  try {
    const client = getTypesenseClientFromConfig(config);
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
      collections: [] as TypesenseCollection[],
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

  const { health, collections, totalDocuments, totalKeys, error } =
    await getDashboardData(activeConfig);

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-sidebar to-sidebar-active rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden">
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

        <StatsGrid
          health={health}
          collections={collections}
          totalDocuments={totalDocuments}
          totalKeys={totalKeys}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentCollections collections={collections} />
          <QuickActions activeConfig={activeConfig} />
        </div>
      </div>
    </div>
  );
}
