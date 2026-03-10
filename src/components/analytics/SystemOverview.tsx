"use client";

import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Activity,
  Gauge,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import type { TypesenseMetrics, TypesenseStats } from "@/types/typesense";

interface SystemOverviewProps {
  metrics: TypesenseMetrics | null;
  stats: TypesenseStats | null;
  loading: boolean;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Skeleton() {
  return <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />;
}

export function SystemOverview({ metrics, stats, loading }: SystemOverviewProps) {
  const cpuKeys = metrics
    ? Object.keys(metrics).filter((k) => k.match(/^system_cpu\d+_active_percentage$/))
    : [];
  const avgCpu =
    cpuKeys.length > 0
      ? cpuKeys.reduce((sum, k) => sum + parseNum((metrics as Record<string, string>)[k]), 0) /
        cpuKeys.length
      : 0;

  const diskTotal = parseNum(metrics?.system_disk_total_bytes);
  const diskUsed = parseNum(metrics?.system_disk_used_bytes);
  const memTotal = parseNum(metrics?.system_memory_total_bytes);
  const memUsed = parseNum(metrics?.system_memory_used_bytes);
  const netReceived = parseNum(metrics?.system_network_received_bytes);
  const netSent = parseNum(metrics?.system_network_sent_bytes);
  const fragRatio = parseNum(metrics?.typesense_memory_fragmentation_ratio);

  const cards = [
    {
      label: "CPU Usage",
      value: `${avgCpu.toFixed(1)}%`,
      sub: `${cpuKeys.length} core${cpuKeys.length !== 1 ? "s" : ""}`,
      icon: <Cpu className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      barColor: "bg-blue-500",
      barValue: avgCpu,
      barMax: 100,
    },
    {
      label: "Memory",
      value: formatBytes(memUsed),
      sub: `of ${formatBytes(memTotal)}`,
      icon: <MemoryStick className="h-5 w-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200",
      barColor: "bg-purple-500",
      barValue: memUsed,
      barMax: memTotal,
    },
    {
      label: "Disk",
      value: formatBytes(diskUsed),
      sub: `of ${formatBytes(diskTotal)}`,
      icon: <HardDrive className="h-5 w-5" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-200",
      barColor: "bg-amber-500",
      barValue: diskUsed,
      barMax: diskTotal,
    },
    {
      label: "Network I/O",
      value: formatBytes(netReceived + netSent),
      sub: `↓${formatBytes(netReceived)} ↑${formatBytes(netSent)}`,
      icon: <Network className="h-5 w-5" />,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
      barColor: "bg-green-500",
      barValue: 0,
      barMax: 0,
    },
    {
      label: "Fragmentation",
      value: fragRatio.toFixed(3),
      sub: "memory ratio",
      icon: <Activity className="h-5 w-5" />,
      color: "text-rose-600",
      bgColor: "bg-rose-50 border-rose-200",
      barColor: "bg-rose-500",
      barValue: Math.min(fragRatio * 50, 100),
      barMax: 100,
    },
    {
      label: "Write Batches",
      value: stats?.pending_write_batches?.toString() ?? "0",
      sub: "pending",
      icon: <Gauge className="h-5 w-5" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 border-indigo-200",
      barColor: "bg-indigo-500",
      barValue: 0,
      barMax: 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.bgColor} transition-all`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${card.color}`}>
              {card.label}
            </span>
            <span className={card.color}>{card.icon}</span>
          </div>
          {loading ? (
            <Skeleton />
          ) : (
            <>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
              {card.barMax > 0 && (
                <ProgressBar value={card.barValue} max={card.barMax} color={card.barColor} />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
