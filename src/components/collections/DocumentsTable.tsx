"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, FileText, LayoutGrid,
  List, SlidersHorizontal,
} from "lucide-react";
import type { TypesenseCollection, TypesenseSearchResult } from "@/types/typesense";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { buildFilterBy, PER_PAGE } from "@/components/collections/document-utils";
import type { RangeFilter, FacetCount } from "@/components/collections/document-utils";
import { FacetPanel, ActiveFilters } from "@/components/collections/FacetPanel";
import { DocumentListItem } from "@/components/collections/DocumentListItem";
import { DocumentGridCard } from "@/components/collections/DocumentGridCard";

interface DocumentsTableProps {
  collection: TypesenseCollection;
}

type ViewMode = "list" | "grid";

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
