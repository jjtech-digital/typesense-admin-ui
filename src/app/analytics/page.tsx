"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";
import { ServerMetrics } from "@/components/analytics/ServerMetrics";
import { SearchStats } from "@/components/analytics/SearchStats";
import { AnalyticsRules } from "@/components/analytics/AnalyticsRules";
import { SystemOverview } from "@/components/analytics/SystemOverview";
import { RefreshCw } from "lucide-react";
import type { TypesenseMetrics, TypesenseStats } from "@/types/typesense";

interface AnalyticsRule {
  name: string;
  type: string;
  collection?: string;
  event_type?: string;
  rule_tag?: string;
  params: Record<string, unknown>;
}

export default function AnalyticsPage() {
  const { getHeaders } = useConnectionConfig();
  const { error: showError } = useToast();

  const [metrics, setMetrics] = useState<TypesenseMetrics | null>(null);
  const [stats, setStats] = useState<TypesenseStats | null>(null);
  const [rules, setRules] = useState<AnalyticsRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    const headers = getHeaders();
    const [metricsRes, statsRes, rulesRes] = await Promise.allSettled([
      fetch("/api/metrics", { headers }),
      fetch("/api/stats", { headers }),
      fetch("/api/analytics/rules", { headers }),
    ]);

    if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
      setMetrics(await metricsRes.value.json());
    } else if (metricsRes.status === "fulfilled") {
      const data = await metricsRes.value.json();
      showError(data.error || "Failed to fetch metrics");
    }

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      setStats(await statsRes.value.json());
    }

    if (rulesRes.status === "fulfilled" && rulesRes.value.ok) {
      const data = await rulesRes.value.json();
      setRules(Array.isArray(data) ? data : data.rules || []);
    }

    setLoading(false);
  }, [getHeaders, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  return (
    <div>
      <Header
        onRefresh={handleRefresh}
      />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Page title bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Server Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time server metrics, search statistics, and analytics rules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* System overview cards */}
        <SystemOverview metrics={metrics} stats={stats} loading={loading} />

        {/* Search stats + Analytics rules */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SearchStats stats={stats} loading={loading} />
          <AnalyticsRules
            rules={rules}
            loading={loading}
            onRefresh={fetchData}
          />
        </div>

        {/* Server metrics — tabbed full-width panel */}
        <ServerMetrics metrics={metrics} loading={loading} />
      </div>
    </div>
  );
}
