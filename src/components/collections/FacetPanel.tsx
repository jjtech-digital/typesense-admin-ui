"use client";

import React, { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { RangeSlider } from "@/components/collections/RangeSlider";
import { NUMERIC_TYPES, INITIAL_VISIBLE } from "@/components/collections/document-utils";
import type { RangeFilter, FacetCount } from "@/components/collections/document-utils";

export function FacetPanel({
  facetFields, facetCounts, filters, rangeFilters, onToggle, onRangeChange, onRangeClear, loading, fieldTypes,
}: {
  facetFields: string[];
  facetCounts: FacetCount[];
  filters: Record<string, string[]>;
  rangeFilters: Record<string, RangeFilter>;
  onToggle: (field: string, value: string) => void;
  onRangeChange: (field: string, range: RangeFilter) => void;
  onRangeClear: (field: string) => void;
  loading: boolean;
  fieldTypes: Record<string, string>;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (field: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });

  const toggleExpand = (field: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });

  const visible = facetFields.filter((f) =>
    !search || f.toLowerCase().includes(search.toLowerCase())
  );
  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0) || Object.keys(rangeFilters).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Facets
        </h3>
        {hasActiveFilters && (
          <button onClick={() => onToggle("__clear__", "")} className="text-xs text-red-500 hover:text-red-700">
            Clear all
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search facets…"
        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
      />

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
      ))}

      {!loading && visible.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No faceted fields</p>
      )}

      {!loading && visible.map((field) => {
        const fc = facetCounts.find((f) => f.field_name === field);
        const counts = fc?.counts ?? [];
        const isCollapsed = collapsed.has(field);
        const selected = filters[field] ?? [];
        const isNumeric = NUMERIC_TYPES.has(fieldTypes[field] ?? "");
        const stats = fc?.stats;
        const hasRange = isNumeric && stats && stats.min !== undefined && stats.max !== undefined && stats.min !== stats.max;
        const currentRange = rangeFilters[field];
        const isExpanded = expanded.has(field);
        const visibleCounts = isExpanded ? counts : counts.slice(0, INITIAL_VISIBLE);
        const hiddenCount = counts.length - INITIAL_VISIBLE;

        return (
          <div key={field} className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(field)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-700 truncate">{field}</span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                {selected.length > 0 && (
                  <span className="text-xs bg-brand text-white rounded-full px-1.5 leading-5">{selected.length}</span>
                )}
                {currentRange && (
                  <span className="text-xs bg-brand text-white rounded-full px-1.5 leading-5">range</span>
                )}
                {isCollapsed
                  ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  : <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                }
              </span>
            </button>

            {!isCollapsed && (
              <div className="px-3 py-2">
                {/* Range slider for numeric fields */}
                {hasRange && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Range filter</span>
                      {currentRange && (
                        <button onClick={() => onRangeClear(field)} className="text-xs text-red-500 hover:text-red-700">
                          Clear
                        </button>
                      )}
                    </div>
                    <RangeSlider
                      min={stats.min!}
                      max={stats.max!}
                      value={currentRange ? [currentRange.min, currentRange.max] : [stats.min!, stats.max!]}
                      onChange={([lo, hi]) => onRangeChange(field, { min: lo, max: hi })}
                      step={fieldTypes[field]?.startsWith("float") ? (stats.max! - stats.min!) / 100 : 1}
                      fieldType={fieldTypes[field] ?? "int32"}
                    />
                    {counts.length > 0 && <div className="border-t border-gray-100 mt-2 pt-2" />}
                  </div>
                )}

                {/* Value checkboxes */}
                {counts.length === 0 && !hasRange ? (
                  <p className="text-xs text-gray-400 py-1">No values</p>
                ) : (
                  <div className="space-y-1">
                    {visibleCounts.map(({ value, count }) => {
                      const checked = selected.includes(value);
                      return (
                        <label key={value} className="flex items-center gap-2 cursor-pointer group py-0.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggle(field, value)}
                            className="rounded border-gray-300 text-brand focus:ring-brand h-3.5 w-3.5"
                          />
                          <span className={`flex-1 text-xs truncate ${checked ? "text-brand font-medium" : "text-gray-700"}`}>
                            {value || <em className="text-gray-400">empty</em>}
                          </span>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{count.toLocaleString()}</span>
                        </label>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleExpand(field)}
                        className="text-xs text-brand hover:underline py-1"
                      >
                        {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Active filter chips ────────────────────────────────────────────────────────

export function ActiveFilters({
  filters, rangeFilters, onRemove, onRangeClear,
}: {
  filters: Record<string, string[]>;
  rangeFilters: Record<string, RangeFilter>;
  onRemove: (f: string, v: string) => void;
  onRangeClear: (f: string) => void;
}) {
  const active = Object.entries(filters).flatMap(([field, vals]) => vals.map((val) => ({ field, val })));
  const ranges = Object.entries(rangeFilters);
  if (active.length === 0 && ranges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(({ field, val }) => (
        <span key={`${field}:${val}`} className="inline-flex items-center gap-1 px-2 py-1 bg-brand/10 text-brand border border-brand/20 rounded-lg text-xs font-medium">
          <span className="text-brand/60">{field}:</span> {val}
          <button onClick={() => onRemove(field, val)} className="hover:text-red-500 transition-colors ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {ranges.map(([field, range]) => (
        <span key={`${field}:range`} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium">
          <span className="text-purple-400">{field}:</span> {range.min}–{range.max}
          <button onClick={() => onRangeClear(field)} className="hover:text-red-500 transition-colors ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
