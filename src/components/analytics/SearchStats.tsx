"use client";

import { Search, Clock, Zap } from "lucide-react";
import type { TypesenseStats } from "@/types/typesense";

interface SearchStatsProps {
  stats: TypesenseStats | null;
  loading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2.5">
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function StatSection({
  title,
  icon,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  data: Record<string, number> | undefined;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="py-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {title}
          </p>
        </div>
        <p className="text-sm text-gray-400 py-2">No data available yet</p>
      </div>
    );
  }

  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </p>
      </div>
      {entries.map(([key, value]) => {
        // Prettify the collection path key
        const displayKey = key
          .replace(/^\/collections\//, "")
          .replace(/\/documents\/search$/, "");
        return (
          <div
            key={key}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm text-gray-600 truncate mr-4" title={key}>
              {displayKey}
            </span>
            <span className="text-sm font-semibold text-gray-900 font-mono whitespace-nowrap">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SearchStats({ stats, loading }: SearchStatsProps) {
  const hasAnyData =
    stats &&
    ((stats.latency_ms && Object.keys(stats.latency_ms).length > 0) ||
      (stats.requests_per_second && Object.keys(stats.requests_per_second).length > 0));

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Search className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Search Statistics</h3>
          <p className="text-xs text-gray-500">Request latencies and throughput per collection</p>
        </div>
      </div>
      <div className="px-5 py-2">
        {loading ? (
          <LoadingSkeleton />
        ) : !hasAnyData ? (
          <div className="text-center py-10">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              No search stats available yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Stats will appear after search requests are made to your collections
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <StatSection
              title="Latency (ms)"
              icon={<Clock className="h-3.5 w-3.5 text-gray-400" />}
              data={stats?.latency_ms}
            />
            <StatSection
              title="Requests / Second"
              icon={<Zap className="h-3.5 w-3.5 text-gray-400" />}
              data={stats?.requests_per_second}
            />
          </div>
        )}
      </div>
    </div>
  );
}
