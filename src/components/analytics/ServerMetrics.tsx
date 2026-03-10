"use client";

import { useState } from "react";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Server,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import type { TypesenseMetrics } from "@/types/typesense";

interface ServerMetricsProps {
  metrics: TypesenseMetrics | null;
  loading: boolean;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val) || 0;
}

/* ── Shared UI pieces ─────────────────────────────────────────────── */

function ProgressRing({
  value,
  max,
  color,
  size = 100,
  stroke = 8,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-800">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function BarGauge({
  label,
  value,
  maxVal,
  displayValue,
  color,
}: {
  label: string;
  value: number;
  maxVal: number;
  displayValue: string;
  color: string;
}) {
  const pct = maxVal > 0 ? Math.min((value / maxVal) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900 font-mono">{displayValue}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3.5">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full">
            <div className="h-2.5 bg-gray-200 rounded-full animate-pulse" style={{ width: `${30 + i * 15}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab definitions ──────────────────────────────────────────────── */

type TabId = "cpu" | "sys-memory" | "ts-memory" | "disk" | "network";

const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  { id: "cpu", label: "CPU", icon: <Cpu className="h-4 w-4" />, color: "text-blue-600", activeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "sys-memory", label: "System Memory", icon: <MemoryStick className="h-4 w-4" />, color: "text-purple-600", activeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "ts-memory", label: "Typesense Memory", icon: <Server className="h-4 w-4" />, color: "text-rose-600", activeColor: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "disk", label: "Disk", icon: <HardDrive className="h-4 w-4" />, color: "text-amber-600", activeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "network", label: "Network", icon: <Network className="h-4 w-4" />, color: "text-green-600", activeColor: "bg-green-50 text-green-700 border-green-200" },
];

/* ── Tab panels ───────────────────────────────────────────────────── */

function CpuPanel({ metrics }: { metrics: TypesenseMetrics }) {
  const cpuEntries = Object.entries(metrics as Record<string, string>)
    .filter(([k]) => k.match(/^system_cpu\d+_active_percentage$/))
    .sort(([a], [b]) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

  const avgCpu =
    cpuEntries.length > 0
      ? cpuEntries.reduce((sum, [, v]) => sum + parseNum(v), 0) / cpuEntries.length
      : 0;

  return (
    <div className="p-5 space-y-6">
      {/* Overview ring + summary */}
      <div className="flex items-center gap-6">
        <ProgressRing value={avgCpu} max={100} color="text-blue-500" size={110} stroke={10} />
        <div>
          <p className="text-2xl font-bold text-gray-900">{avgCpu.toFixed(1)}%</p>
          <p className="text-sm text-gray-500">Average CPU usage</p>
          <p className="text-xs text-gray-400 mt-1">
            {cpuEntries.length} core{cpuEntries.length !== 1 ? "s" : ""} detected
          </p>
        </div>
      </div>

      {/* Per-core bars */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Per-core utilization
        </p>
        <div className="space-y-3">
          {cpuEntries.map(([key, val]) => {
            const coreNum = key.match(/\d+/)?.[0] || "?";
            const pct = parseNum(val);
            return (
              <BarGauge
                key={key}
                label={`Core ${coreNum}`}
                value={pct}
                maxVal={100}
                displayValue={`${pct.toFixed(1)}%`}
                color={pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-blue-500"}
              />
            );
          })}
          {cpuEntries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No CPU data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemMemoryPanel({ metrics }: { metrics: TypesenseMetrics }) {
  const total = parseNum(metrics.system_memory_total_bytes);
  const used = parseNum(metrics.system_memory_used_bytes);
  const free = total - used;
  const pct = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="p-5 space-y-6">
      {/* Overview ring + summary */}
      <div className="flex items-center gap-6">
        <ProgressRing value={used} max={total} color="text-purple-500" size={110} stroke={10} />
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(used)}</p>
          <p className="text-sm text-gray-500">of {formatBytes(total)} used</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatBytes(free)} free ({(100 - pct).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Bar */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Memory Allocation
        </p>
        <BarGauge
          label="Used"
          value={used}
          maxVal={total}
          displayValue={formatBytes(used)}
          color={pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-purple-500"}
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Memory" value={formatBytes(total)} color="text-purple-700" />
        <MetricCard label="Used Memory" value={formatBytes(used)} sub={`${pct.toFixed(1)}%`} color="text-purple-700" />
        <MetricCard label="Free Memory" value={formatBytes(free)} sub={`${(100 - pct).toFixed(1)}%`} color="text-green-700" />
        <MetricCard label="Usage Level" value={pct > 90 ? "Critical" : pct > 70 ? "High" : pct > 40 ? "Moderate" : "Low"} color={pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-green-600"} />
      </div>
    </div>
  );
}

function TypesenseMemoryPanel({ metrics }: { metrics: TypesenseMetrics }) {
  const active = parseNum(metrics.typesense_memory_active_bytes);
  const allocated = parseNum(metrics.typesense_memory_allocated_bytes);
  const resident = parseNum(metrics.typesense_memory_resident_bytes);
  const mapped = parseNum(metrics.typesense_memory_mapped_bytes);
  const metadata = parseNum(metrics.typesense_memory_metadata_bytes);
  const retained = parseNum(metrics.typesense_memory_retained_bytes);
  const fragRatio = parseNum(metrics.typesense_memory_fragmentation_ratio);

  // Use resident as the "max" reference for bars
  const maxRef = Math.max(resident, mapped, allocated, 1);

  return (
    <div className="p-5 space-y-6">
      {/* Headline summary */}
      <div className="flex items-center gap-6">
        <div className="w-[110px] h-[110px] rounded-full bg-rose-50 flex flex-col items-center justify-center border-4 border-rose-200">
          <p className="text-lg font-bold text-rose-700">{formatBytes(active)}</p>
          <p className="text-[10px] text-rose-500 font-medium">ACTIVE</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(resident)}</p>
          <p className="text-sm text-gray-500">Resident memory</p>
          <p className="text-xs text-gray-400 mt-1">
            Fragmentation ratio: <span className="font-mono font-semibold">{fragRatio.toFixed(4)}</span>
          </p>
        </div>
      </div>

      {/* Memory bars */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Memory Breakdown
        </p>
        <div className="space-y-3">
          <BarGauge label="Active" value={active} maxVal={maxRef} displayValue={formatBytes(active)} color="bg-rose-500" />
          <BarGauge label="Allocated" value={allocated} maxVal={maxRef} displayValue={formatBytes(allocated)} color="bg-rose-400" />
          <BarGauge label="Resident" value={resident} maxVal={maxRef} displayValue={formatBytes(resident)} color="bg-rose-600" />
          <BarGauge label="Mapped" value={mapped} maxVal={maxRef} displayValue={formatBytes(mapped)} color="bg-pink-400" />
          <BarGauge label="Metadata" value={metadata} maxVal={maxRef} displayValue={formatBytes(metadata)} color="bg-pink-300" />
          <BarGauge label="Retained" value={retained} maxVal={maxRef} displayValue={formatBytes(retained)} color="bg-pink-200" />
        </div>
      </div>

      {/* Fragmentation card */}
      <div className={cn(
        "rounded-lg p-4 border",
        fragRatio > 2 ? "bg-red-50 border-red-200" : fragRatio > 1.5 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Fragmentation Ratio</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {fragRatio > 2 ? "High fragmentation — consider restarting" : fragRatio > 1.5 ? "Moderate fragmentation" : "Healthy fragmentation level"}
            </p>
          </div>
          <p className={cn(
            "text-2xl font-bold font-mono",
            fragRatio > 2 ? "text-red-600" : fragRatio > 1.5 ? "text-amber-600" : "text-green-600"
          )}>
            {fragRatio.toFixed(4)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DiskPanel({ metrics }: { metrics: TypesenseMetrics }) {
  const total = parseNum(metrics.system_disk_total_bytes);
  const used = parseNum(metrics.system_disk_used_bytes);
  const free = total - used;
  const pct = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="p-5 space-y-6">
      {/* Overview ring + summary */}
      <div className="flex items-center gap-6">
        <ProgressRing value={used} max={total} color="text-amber-500" size={110} stroke={10} />
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(used)}</p>
          <p className="text-sm text-gray-500">of {formatBytes(total)} used</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatBytes(free)} available ({(100 - pct).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Stacked usage bar */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Disk Usage
        </p>
        <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
          <div
            className={cn(
              "h-6 rounded-full transition-all duration-500 flex items-center justify-center text-xs font-semibold text-white",
              pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-amber-400"
            )}
            style={{ width: `${Math.max(pct, 5)}%` }}
          >
            {pct >= 15 ? `${pct.toFixed(1)}%` : ""}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0 B</span>
          <span>{formatBytes(total)}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total" value={formatBytes(total)} color="text-amber-700" />
        <MetricCard label="Used" value={formatBytes(used)} sub={`${pct.toFixed(1)}%`} color="text-amber-700" />
        <MetricCard label="Free" value={formatBytes(free)} sub={`${(100 - pct).toFixed(1)}%`} color="text-green-700" />
      </div>
    </div>
  );
}

function NetworkPanel({ metrics }: { metrics: TypesenseMetrics }) {
  const received = parseNum(metrics.system_network_received_bytes);
  const sent = parseNum(metrics.system_network_sent_bytes);
  const total = received + sent;
  const maxRef = Math.max(received, sent, 1);

  return (
    <div className="p-5 space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6">
        <div className="w-[110px] h-[110px] rounded-full bg-green-50 flex flex-col items-center justify-center border-4 border-green-200">
          <p className="text-lg font-bold text-green-700">{formatBytes(total)}</p>
          <p className="text-[10px] text-green-500 font-medium">TOTAL I/O</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total network throughput</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-700">↓ {formatBytes(received)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-gray-700">↑ {formatBytes(sent)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Transfer Breakdown
        </p>
        <div className="space-y-3">
          <BarGauge label="Received (↓)" value={received} maxVal={maxRef} displayValue={formatBytes(received)} color="bg-green-500" />
          <BarGauge label="Sent (↑)" value={sent} maxVal={maxRef} displayValue={formatBytes(sent)} color="bg-emerald-400" />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Received" value={formatBytes(received)} sub="inbound" color="text-green-700" />
        <MetricCard label="Sent" value={formatBytes(sent)} sub="outbound" color="text-emerald-700" />
        <MetricCard label="Total" value={formatBytes(total)} sub="both directions" color="text-gray-700" />
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

export function ServerMetrics({ metrics, loading }: ServerMetricsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("cpu");

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Server className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Server Metrics</h3>
          <p className="text-xs text-gray-500">Detailed resource utilization</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-3 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border",
                activeTab === tab.id
                  ? tab.activeColor
                  : "text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel content */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : !metrics ? (
        <div className="p-10 text-center">
          <Server className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No metrics data available</p>
          <p className="text-xs text-gray-400 mt-1">
            Ensure your Typesense server is running and accessible
          </p>
        </div>
      ) : (
        <>
          {activeTab === "cpu" && <CpuPanel metrics={metrics} />}
          {activeTab === "sys-memory" && <SystemMemoryPanel metrics={metrics} />}
          {activeTab === "ts-memory" && <TypesenseMemoryPanel metrics={metrics} />}
          {activeTab === "disk" && <DiskPanel metrics={metrics} />}
          {activeTab === "network" && <NetworkPanel metrics={metrics} />}
        </>
      )}
    </div>
  );
}
