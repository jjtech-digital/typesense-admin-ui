"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import type { FilterRow, CollectionField } from "@/components/overrides/curation-rule-types";
import { getOperatorsForType } from "@/components/overrides/curation-rule-constants";

// ── FilterBuilder ────────────────────────────────────────────────────

export function FilterBuilder({
  rows,
  onChange,
  fields,
  label,
}: {
  rows: FilterRow[];
  onChange: (rows: FilterRow[]) => void;
  fields: CollectionField[];
  label?: string;
}) {
  const filterableFields = fields.filter(
    (f) => (f.facet || f.sort || ["int32", "int64", "float", "bool"].includes(f.type)) && f.index !== false
  );

  const addRow = () => {
    const defaultField = filterableFields[0]?.name || "";
    const defaultType = filterableFields[0]?.type || "string";
    const ops = getOperatorsForType(defaultType);
    onChange([...rows, { field: defaultField, operator: ops[0].value, value: "", connector: "&&" }]);
  };

  const updateRow = (index: number, patch: Partial<FilterRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    // When field changes, reset operator to first valid one
    if (patch.field) {
      const f = fields.find((ff) => ff.name === patch.field);
      const ops = getOperatorsForType(f?.type || "string");
      if (!ops.find((o) => o.value === next[index].operator)) {
        next[index].operator = ops[0].value;
      }
    }
    onChange(next);
  };

  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>}
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-1">No filters defined.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, i) => {
            const fieldMeta = fields.find((f) => f.name === row.field);
            const operators = getOperatorsForType(fieldMeta?.type || "string");
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => updateRow(i - 1, { connector: rows[i - 1].connector === "&&" ? "||" : "&&" })}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                        rows[i - 1].connector === "&&"
                          ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                          : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                      }`}
                    >
                      {rows[i - 1].connector === "&&" ? "AND" : "OR"}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <select
                    value={row.field}
                    onChange={(e) => updateRow(i, { field: e.target.value })}
                    className="w-[120px] text-xs border border-gray-300 rounded-lg px-2 py-[7px] bg-white focus:outline-none focus:ring-2 focus:ring-brand truncate"
                  >
                    {!filterableFields.find((f) => f.name === row.field) && row.field && (
                      <option value={row.field}>{row.field}</option>
                    )}
                    {filterableFields.map((f) => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                  <select
                    value={row.operator}
                    onChange={(e) => updateRow(i, { operator: e.target.value })}
                    className="w-[72px] text-xs border border-gray-300 rounded-lg px-2 py-[7px] bg-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    placeholder={fieldMeta?.type === "bool" ? "true / false" : "value"}
                    className="flex-1 min-w-0 text-xs border border-gray-300 rounded-lg px-2 py-[7px] bg-white focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-gray-400"
                  />
                  <button onClick={() => removeRow(i)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        disabled={filterableFields.length === 0}
        className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover font-medium disabled:opacity-40 disabled:cursor-not-allowed pt-1"
      >
        <Plus className="h-3 w-3" />
        Add filter
      </button>
    </div>
  );
}
