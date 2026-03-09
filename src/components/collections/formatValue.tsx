import React from "react";
import { ExternalLink } from "lucide-react";

export function formatValue(value: unknown, maxLen = 80): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-300 italic text-xs">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="font-mono text-emerald-600 text-sm">{value.toLocaleString()}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-300 italic text-xs">[ ]</span>;
    return (
      <span className="inline-flex items-center gap-1 flex-wrap">
        {value.slice(0, 4).map((v, i) => (
          <span key={i} className="inline-block bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded">
            {typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v)}
          </span>
        ))}
        {value.length > 4 && (
          <span className="text-xs text-gray-400 ml-1">+{value.length - 4}</span>
        )}
      </span>
    );
  }
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return <span className="font-mono text-xs text-gray-500">{str.length > maxLen ? str.slice(0, maxLen) + "…" : str}</span>;
  }
  const str = String(value);
  if (str.startsWith("http")) {
    return (
      <a href={str} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {str.length > maxLen ? str.slice(0, maxLen) + "…" : str}
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    );
  }
  return <span className="text-gray-800 text-sm break-words">{str.length > maxLen ? str.slice(0, maxLen) + "…" : str}</span>;
}
