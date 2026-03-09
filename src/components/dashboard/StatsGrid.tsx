import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Database,
  FileText,
  Key,
  ArrowRight,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { TypesenseCollection } from "@/types/typesense";

interface StatsGridProps {
  health: { ok: boolean };
  collections: TypesenseCollection[];
  totalDocuments: number;
  totalKeys: number;
}

export function StatsGrid({
  health,
  collections,
  totalDocuments,
  totalKeys,
}: StatsGridProps) {
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

  return (
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
          <p className={`text-2xl sm:text-3xl font-bold ${stat.textColor}`}>
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
  );
}
