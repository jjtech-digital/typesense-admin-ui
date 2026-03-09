"use client";

import { Plus, X } from "lucide-react";
import type { SortRow, CollectionField } from "@/components/overrides/curation-rule-types";

// ── SortBuilder ──────────────────────────────────────────────────────

export function SortBuilder({
  rows,
  onChange,
  fields,
  label,
}: {
  rows: SortRow[];
  onChange: (rows: SortRow[]) => void;
  fields: CollectionField[];
  label?: string;
}) {
  const sortableFields = fields.filter((f) => f.sort && f.index !== false);

  const addRow = () => {
    const defaultField = sortableFields[0]?.name || "";
    onChange([...rows, { field: defaultField, direction: "desc" }]);
  };

  const updateRow = (index: number, patch: Partial<SortRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>}
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-1">No sort fields defined.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{i + 1}.</span>
              <select
                value={row.field}
                onChange={(e) => updateRow(i, { field: e.target.value })}
                className="flex-1 min-w-0 text-xs border border-gray-300 rounded-lg px-2 py-[7px] bg-white focus:outline-none focus:ring-2 focus:ring-brand truncate"
              >
                {!sortableFields.find((f) => f.name === row.field) && row.field && (
                  <option value={row.field}>{row.field}</option>
                )}
                {sortableFields.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
              <select
                value={row.direction}
                onChange={(e) => updateRow(i, { direction: e.target.value as "asc" | "desc" })}
                className="w-[80px] text-xs border border-gray-300 rounded-lg px-2 py-[7px] bg-white focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <button onClick={() => removeRow(i)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        disabled={sortableFields.length === 0}
        className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover font-medium disabled:opacity-40 disabled:cursor-not-allowed pt-1"
      >
        <Plus className="h-3 w-3" />
        Add sort field
      </button>
    </div>
  );
}
