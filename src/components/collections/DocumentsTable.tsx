"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, FileText, LayoutGrid,
  List, SlidersHorizontal, X, ChevronDown, ChevronUp, ExternalLink,
  Pencil, Trash2, Save,
} from "lucide-react";
import type { TypesenseCollection, TypesenseSearchResult } from "@/types/typesense";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface DocumentsTableProps {
  collection: TypesenseCollection;
}

type ViewMode = "list" | "grid";

interface FacetCount {
  field_name: string;
  counts: { value: string; count: number }[];
  stats?: { avg?: number; max?: number; min?: number; sum?: number };
}

// ── Image detection ────────────────────────────────────────────────────────────

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif|avif|svg|bmp|tiff?)(\?.*)?$/i;

/** Priority field names checked first (case-insensitive) */
const IMAGE_FIELD_PATTERNS = /^(image|images|img|photo|picture|thumbnail|cover|gallery|featuredImage|mainImage|primaryImage|productImage|displayImage|heroImage|banner|logo|avatar|icon)/i;

function isImageUrl(val: string): boolean {
  return IMAGE_EXT_RE.test(val);
}

function looksLikeUrl(val: string): boolean {
  return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//");
}

/**
 * Deep-scan any value for the first image URL.
 * Recurses into objects and arrays up to `maxDepth` levels.
 */
function extractImageUrl(val: unknown, depth: number): string | null {
  if (depth <= 0) return null;
  if (typeof val === "string" && looksLikeUrl(val) && isImageUrl(val)) return val;
  if (Array.isArray(val)) {
    for (const item of val) {
      const found = extractImageUrl(item, depth - 1);
      if (found) return found;
    }
  }
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    // Check common URL keys first
    for (const k of ["url", "src", "href", "image", "imageUrl", "image_url", "thumbnail"]) {
      const v = obj[k];
      if (typeof v === "string" && looksLikeUrl(v) && isImageUrl(v)) return v;
    }
    // Then scan all values
    for (const v of Object.values(obj)) {
      const found = extractImageUrl(v, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function findFirstImage(doc: Record<string, unknown>): string | null {
  // Pass 1: check fields whose names suggest they hold images
  for (const [key, val] of Object.entries(doc)) {
    if (!IMAGE_FIELD_PATTERNS.test(key)) continue;
    // Direct string URL
    if (typeof val === "string" && looksLikeUrl(val)) return val;
    // Deep-scan arrays/objects behind image-named keys
    const found = extractImageUrl(val, 4);
    if (found) return found;
  }

  // Pass 2: scan every top-level value for any string with an image extension
  for (const val of Object.values(doc)) {
    if (typeof val === "string" && looksLikeUrl(val) && isImageUrl(val)) return val;
  }

  // Pass 3: deep-scan nested objects/arrays (max 3 levels) for image URLs
  for (const val of Object.values(doc)) {
    if (typeof val !== "object" || val === null) continue;
    const found = extractImageUrl(val, 3);
    if (found) return found;
  }

  return null;
}

// ── Value formatting ───────────────────────────────────────────────────────────

function formatValue(value: unknown, maxLen = 80): React.ReactNode {
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

// ── Primary field detection ────────────────────────────────────────────────────

const TITLE_FIELDS = ["name", "title", "productName", "label", "displayName", "heading", "subject"];
const SUBTITLE_FIELDS = ["sku", "productCode", "code", "reference", "slug", "url"];
const PRICE_FIELDS = ["price", "salePrice", "regularPrice", "cost", "amount"];

function findField(doc: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    const v = doc[key];
    if (v !== null && v !== undefined && v !== "") return key;
  }
  return null;
}

// ── Filter builder ─────────────────────────────────────────────────────────────

type RangeFilter = { min: number; max: number };

function buildFilterBy(
  filters: Record<string, string[]>,
  rangeFilters?: Record<string, RangeFilter>
): string {
  const parts: string[] = [];
  for (const [field, vals] of Object.entries(filters)) {
    if (vals.length > 0) {
      parts.push(`${field}:=[\`${vals.join("\`,\`")}\`]`);
    }
  }
  if (rangeFilters) {
    for (const [field, range] of Object.entries(rangeFilters)) {
      parts.push(`${field}:[${range.min}..${range.max}]`);
    }
  }
  return parts.join(" && ");
}

const PER_PAGE = 25;

// ── Numeric field type detection ──────────────────────────────────────────────

const NUMERIC_TYPES = new Set(["int32", "int64", "float", "int32[]", "int64[]", "float[]"]);

// ── Range slider ────────────────────────────────────────────────────────────

function RangeSlider({
  min, max, value, onChange, step, fieldType,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  step: number;
  fieldType: string;
}) {
  const rangeRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(value[0]);
  const rightPct = pct(value[1]);

  const fmt = (v: number) =>
    fieldType.startsWith("float")
      ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : Math.round(v).toLocaleString();

  const handlePointer = (idx: 0 | 1) => (e: React.PointerEvent) => {
    e.preventDefault();
    const el = rangeRef.current;
    if (!el) return;
    const onMove = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      let raw = min + ratio * (max - min);
      raw = Math.round(raw / step) * step;
      raw = Math.max(min, Math.min(max, raw));
      const next: [number, number] = [...value] as [number, number];
      next[idx] = raw;
      if (next[0] > next[1]) { next[idx === 0 ? 1 : 0] = raw; }
      onChange(next);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <div className="px-1 pt-1 pb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{fmt(value[0])}</span>
        <span className="text-xs text-gray-400">—</span>
        <span className="text-xs font-mono text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">{fmt(value[1])}</span>
      </div>
      <div ref={rangeRef} className="relative h-5 flex items-center cursor-pointer select-none touch-none">
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 bg-gray-200 rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-brand rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        {/* Left thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-brand rounded-full shadow-sm hover:scale-110 transition-transform -translate-x-1/2"
          style={{ left: `${leftPct}%` }}
          onPointerDown={handlePointer(0)}
        />
        {/* Right thumb */}
        <div
          className="absolute w-4 h-4 bg-white border-2 border-brand rounded-full shadow-sm hover:scale-110 transition-transform -translate-x-1/2"
          style={{ left: `${rightPct}%` }}
          onPointerDown={handlePointer(1)}
        />
      </div>
    </div>
  );
}

// ── Facets panel ───────────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 8;

function FacetPanel({
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

// ── Document list item ─────────────────────────────────────────────────────────

const SHOWN_FIELDS = 10;

function DocumentListItem({
  doc, index, collectionName, onDeleted, onUpdated,
}: {
  doc: Record<string, unknown>;
  index: number;
  collectionName: string;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, updated: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { getConfig, getBaseUrl } = useConnectionConfig();

  const imageUrl = findFirstImage(doc);
  const entries = Object.entries(doc);
  const shown = expanded ? entries : entries.slice(0, SHOWN_FIELDS);
  const hiddenCount = entries.length - SHOWN_FIELDS;
  const docId = String(doc.id ?? "");

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const cfg = getConfig();
    const baseUrl = getBaseUrl();
    if (!cfg || !baseUrl) return;
    setDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/collections/${collectionName}/documents/${docId}`, {
        method: "DELETE",
        headers: { "X-TYPESENSE-API-KEY": cfg.apiKey },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      onDeleted(docId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const openEdit = () => {
    setEditJson(JSON.stringify(doc, null, 2));
    setEditError(null);
    setShowEdit(true);
  };

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editJson);
    } catch {
      setEditError("Invalid JSON — please fix syntax errors before saving.");
      return;
    }
    const cfg = getConfig();
    const baseUrl = getBaseUrl();
    if (!cfg || !baseUrl) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`${baseUrl}/collections/${collectionName}/documents/${docId}`, {
        method: "PATCH",
        headers: { "X-TYPESENSE-API-KEY": cfg.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      onUpdated(docId, data);
      setShowEdit(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
        <div className="flex gap-3 p-4">
          {/* Index */}
          <div className="flex-shrink-0 w-6 pt-0.5 text-right">
            <span className="text-xs font-mono text-gray-400">{index}</span>
          </div>

          {/* Key-value fields — Algolia style: keys right-aligned */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <table className="w-full">
              <tbody>
                {shown.map(([key, value]) => (
                  <tr key={key} className="align-top group">
                    <td className="text-right font-semibold text-gray-600 pr-3 sm:pr-4 whitespace-nowrap py-0.5 text-xs w-28 sm:w-48 flex-shrink-0">
                      {key}
                    </td>
                    <td className="py-0.5 min-w-0 max-w-0 w-full">
                      <div className="break-words">{formatValue(value)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Image thumbnail — top right */}
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 self-start"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt="preview"
                className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-brand transition-colors shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </a>
          )}
        </div>

        {/* Footer: show more + action buttons */}
        <div className="flex items-center justify-between px-4 pb-3 border-t border-gray-50 pt-2">
          {hiddenCount > 0 ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> Show less</>
                : <><ChevronDown className="h-3 w-3" /> Show more attributes ({hiddenCount})</>
              }
            </button>
          ) : <span />}

          <div className="flex items-center gap-1">
            <button
              onClick={openEdit}
              title="Edit document JSON"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title={confirmDelete ? "Click again to confirm delete" : "Delete document"}
              className={`p-1.5 rounded-lg transition-colors ${confirmDelete ? "text-red-600 bg-red-50 ring-1 ring-red-200" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Document</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">id: {docId}</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
              <textarea
                value={editJson}
                onChange={(e) => { setEditJson(e.target.value); setEditError(null); }}
                className="w-full h-96 font-mono text-xs border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50"
                spellCheck={false}
              />
              {editError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" />
                Update Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Document grid card ─────────────────────────────────────────────────────────

function DocumentGridCard({ doc }: { doc: Record<string, unknown> }) {
  const imageUrl = findFirstImage(doc);
  const titleKey = findField(doc, TITLE_FIELDS);
  const subtitleKey = findField(doc, SUBTITLE_FIELDS);
  const priceKey = findField(doc, PRICE_FIELDS);

  const title = titleKey ? String(doc[titleKey]) : String(doc.id ?? "—");
  const subtitle = subtitleKey ? String(doc[subtitleKey]) : null;

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden hover:border-brand hover:shadow-md transition-all group cursor-pointer">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-10 w-10 text-gray-200" />
          </div>
        )}
        {doc.isAvailable !== undefined && (
          <div className="absolute top-2 right-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${doc.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {doc.isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-mono truncate">{subtitle}</p>}
        {priceKey && doc[priceKey] !== null && (
          <p className="text-sm font-bold text-gray-900">{formatValue(doc[priceKey])}</p>
        )}
        <p className="text-xs text-gray-400 font-mono truncate">id: {String(doc.id ?? "—")}</p>
      </div>
    </div>
  );
}

// ── Active filter chips ────────────────────────────────────────────────────────

function ActiveFilters({
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

// ── Main component ─────────────────────────────────────────────────────────────

export function DocumentsTable({ collection }: DocumentsTableProps) {
  const [query, setQuery] = useState("*");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<TypesenseSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [rangeFilters, setRangeFilters] = useState<Record<string, RangeFilter>>({});
  const { getConfig, getBaseUrl } = useConnectionConfig();
  const abortRef = useRef<AbortController | null>(null);

  const facetFields = collection.fields.filter((f) => f.facet).map((f) => f.name);
  const facetBy = facetFields.join(",");
  const fieldTypes: Record<string, string> = {};
  for (const f of collection.fields) { fieldTypes[f.name] = f.type; }

  // Build query_by from all indexed string fields in the schema
  const queryBy = collection.fields
    .filter((f) => (f.type === "string" || f.type === "string[]") && f.index !== false)
    .map((f) => f.name)
    .join(",") || ".*";

  const fetchDocuments = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const cfg = getConfig();
      const baseUrl = getBaseUrl();
      if (!cfg || !baseUrl) throw new Error("Not connected to Typesense");

      const filterBy = buildFilterBy(filters, rangeFilters);
      const params = new URLSearchParams({
        q: query,
        query_by: queryBy,
        page: page.toString(),
        per_page: PER_PAGE.toString(),
      });
      if (filterBy) params.set("filter_by", filterBy);
      if (facetBy) { params.set("facet_by", facetBy); params.set("max_facet_values", "30"); }

      const res = await fetch(
        `${baseUrl}/collections/${collection.name}/documents/search?${params}`,
        { headers: { "X-TYPESENSE-API-KEY": cfg.apiKey }, signal: abortRef.current.signal }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch documents");
      setResults(data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to fetch documents");
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.name, query, queryBy, page, filters, rangeFilters, facetBy, getConfig, getBaseUrl]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput || "*");
    setPage(1);
  };

  const handleRangeChange = (field: string, range: RangeFilter) => {
    setRangeFilters((prev) => ({ ...prev, [field]: range }));
    setPage(1);
  };

  const handleRangeClear = (field: string) => {
    setRangeFilters((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setPage(1);
  };

  const toggleFacet = (field: string, value: string) => {
    if (field === "__clear__") { setFilters({}); setRangeFilters({}); setPage(1); return; }
    setFilters((prev) => {
      const current = prev[field] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const updated = { ...prev, [field]: next };
      if (updated[field].length === 0) delete updated[field];
      return updated;
    });
    setPage(1);
  };

  const handleDeleted = (id: string) => {
    setResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        found: Math.max(0, prev.found - 1),
        hits: prev.hits.filter((h) => String(h.document.id) !== id),
      };
    });
  };

  const handleUpdated = (id: string, updated: Record<string, unknown>) => {
    setResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        hits: prev.hits.map((h) =>
          String(h.document.id) === id
            ? { ...h, document: { ...updated, id: String(updated.id ?? id) } as TypesenseSearchResult["hits"][0]["document"] }
            : h
        ),
      };
    });
  };

  const totalPages = results ? Math.ceil(results.found / PER_PAGE) : 0;
  const facetCounts: FacetCount[] = (results?.facet_counts as FacetCount[] | undefined) ?? [];

  const [showFacets, setShowFacets] = useState(false);
  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0) || Object.keys(rangeFilters).length > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search bar + view toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents…"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button type="submit" variant="primary">Search</Button>
          {query !== "*" && (
            <Button type="button" variant="ghost" onClick={() => { setSearchInput(""); setQuery("*"); setPage(1); }}>
              Clear
            </Button>
          )}
        </form>

        <div className="flex gap-2 flex-shrink-0">
          {/* Mobile facet toggle */}
          {facetFields.length > 0 && (
            <button
              onClick={() => setShowFacets((v) => !v)}
              className={`lg:hidden p-2 rounded-lg border transition-colors ${showFacets || hasActiveFilters ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}
              title="Toggle facets"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setViewMode("list")} title="List view"
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-brand text-white" : "text-gray-400 hover:bg-gray-50"}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("grid")} title="Grid view"
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-brand text-white" : "text-gray-400 hover:bg-gray-50"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      <ActiveFilters filters={filters} rangeFilters={rangeFilters} onRemove={toggleFacet} onRangeClear={handleRangeClear} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {results && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {results.found > 0 ? (
              <>
                Showing <strong className="text-gray-900">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, results.found)}</strong>
                {" "}of <strong className="text-gray-900">{results.found.toLocaleString()}</strong> documents
              </>
            ) : "No documents found"}
          </span>
          <span className="text-xs text-gray-400">{results.search_time_ms}ms</span>
        </div>
      )}

      {/* Two-column: facets + documents */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
        {/* Facets sidebar — collapsible on mobile, always visible on lg+ */}
        {facetFields.length > 0 && (
          <aside className={`w-full lg:w-56 flex-shrink-0 lg:sticky lg:top-20 ${showFacets ? "block" : "hidden lg:block"}`}>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <FacetPanel
                facetFields={facetFields}
                facetCounts={facetCounts}
                filters={filters}
                rangeFilters={rangeFilters}
                onToggle={toggleFacet}
                onRangeChange={handleRangeChange}
                onRangeClear={handleRangeClear}
                loading={loading && facetCounts.length === 0}
                fieldTypes={fieldTypes}
              />
            </div>
          </aside>
        )}

        {/* Documents */}
        <div className="flex-1 min-w-0">
          {loading && !results ? (
            <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`bg-gray-100 rounded-xl animate-pulse ${viewMode === "grid" ? "h-64" : "h-28"}`} />
              ))}
            </div>
          ) : results?.hits && results.hits.length > 0 ? (
            viewMode === "list" ? (
              <div className="space-y-3">
                {results.hits.map((hit, i) => (
                  <DocumentListItem
                    key={hit.document.id || i}
                    doc={hit.document as Record<string, unknown>}
                    index={(page - 1) * PER_PAGE + i + 1}
                    collectionName={collection.name}
                    onDeleted={handleDeleted}
                    onUpdated={handleUpdated}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {results.hits.map((hit, i) => (
                  <DocumentGridCard
                    key={hit.document.id || i}
                    doc={hit.document as Record<string, unknown>}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">
                {query !== "*" ? `No results for "${query}"` : "No documents"}
              </p>
              {(Object.keys(filters).length > 0 || Object.keys(rangeFilters).length > 0) && (
                <button onClick={() => { setFilters({}); setRangeFilters({}); setPage(1); }} className="mt-2 text-sm text-brand hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) pageNum = i + 1;
                  else if (page <= 4) pageNum = i + 1;
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                  else pageNum = page - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${page === pageNum ? "bg-brand text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
