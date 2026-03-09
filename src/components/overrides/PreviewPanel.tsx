"use client";

import {
  Search, Eye, FileText, Pin, X,
  LayoutGrid, List, ImageOff,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { PreviewResult, ExcludeEntry } from "@/components/overrides/curation-rule-types";

// ── PreviewPanel ─────────────────────────────────────────────────────

const PREVIEW_PER_PAGE = 20;

export function PreviewPanel({
  preview,
  previewLoading,
  previewError,
  previewMode,
  setPreviewMode,
  previewPage,
  previewSearchQuery,
  setPreviewSearchQuery,
  query,
  excludes,
  runPreview,
}: {
  preview: PreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  previewMode: "grid" | "list";
  setPreviewMode: (mode: "grid" | "list") => void;
  previewPage: number;
  previewSearchQuery: string;
  setPreviewSearchQuery: (q: string) => void;
  query: string;
  excludes: ExcludeEntry[];
  runPreview: (page?: number) => void;
}) {
  return (
    <div className="w-full lg:flex-1 min-w-0">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
            </div>
            <div className="flex items-center gap-3">
              {preview && (
                <span className="text-xs text-gray-400">
                  {preview.found.toLocaleString()} found · {preview.search_time_ms}ms
                </span>
              )}
              <div className="flex items-center bg-gray-200/60 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === "grid" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === "list" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
                  title="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={previewSearchQuery}
              onChange={(e) => setPreviewSearchQuery(e.target.value)}
              placeholder={`Search within results (default: "${query || "…"}")`}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand placeholder:text-gray-400"
            />
            {previewSearchQuery && (
              <button
                onClick={() => setPreviewSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {!preview && !previewLoading && !previewError && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Eye className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No preview yet</p>
              <p className="text-xs text-gray-400 mt-1">Enter a query to see live results</p>
            </div>
          )}

          {previewLoading && (
            <div className={previewMode === "grid" ? "grid grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-3"}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`bg-gray-100 rounded-lg animate-pulse ${previewMode === "grid" ? "h-48" : "h-20"}`} />
              ))}
            </div>
          )}

          {previewError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{previewError}</div>
          )}

          {preview && !previewLoading && (
            <>
              {preview.hits.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-gray-400">
                  <FileText className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No results for &ldquo;{previewSearchQuery || query}&rdquo;</p>
                </div>
              ) : previewMode === "grid" ? (
                /* ── Grid view ── */
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {preview.hits.map((hit, i) => {
                    const doc = hit.document;
                    const id = String(doc.id ?? "");
                    const isPinned = hit.pinned;
                    const isExcluded = excludes.some((e) => e.id === id);
                    const title = (doc.name || doc.title || doc.productName || doc.label || id) as string;
                    const image = (doc.image_link || doc.image || doc.thumbnail || doc.image_url || "") as string;
                    const price = doc.price as number | undefined;
                    const salePrice = doc.sale_price as number | undefined;
                    const brand = (doc.brand || "") as string;
                    const availability = (doc.availability || "") as string;

                    return (
                      <div
                        key={`${id}-${i}`}
                        className={`rounded-xl border overflow-hidden transition-colors group relative ${
                          isPinned
                            ? "border-green-300 bg-green-50/30 ring-1 ring-green-200"
                            : isExcluded
                            ? "border-red-200 bg-red-50/30 opacity-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Position badge */}
                        <span className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 min-w-[20px] text-center">
                          {i + 1}
                        </span>
                        {isPinned && (
                          <span className="absolute top-2 right-2 z-10">
                            <Badge variant="success" className="flex items-center gap-0.5 text-[10px] shadow-sm">
                              <Pin className="h-2.5 w-2.5" /> Pinned
                            </Badge>
                          </span>
                        )}
                        {/* Image */}
                        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                          {image ? (
                            <img
                              src={image}
                              alt={title}
                              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                            />
                          ) : null}
                          <div className={`flex flex-col items-center justify-center text-gray-300 ${image ? "hidden" : ""}`}>
                            <ImageOff className="h-8 w-8" />
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1">{title}</p>
                          {brand && <p className="text-[10px] text-gray-500 mb-1">{brand}</p>}
                          <div className="flex items-baseline gap-1.5">
                            {salePrice ? (
                              <>
                                <span className="text-sm font-bold text-red-600">${salePrice.toFixed(2)}</span>
                                {price && <span className="text-[10px] text-gray-400 line-through">${price.toFixed(2)}</span>}
                              </>
                            ) : price ? (
                              <span className="text-sm font-bold text-gray-900">${price.toFixed(2)}</span>
                            ) : null}
                          </div>
                          {availability && (
                            <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                              availability === "in stock"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {availability}
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono mt-1 truncate">{id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── List view ── */
                <div className="space-y-2">
                  {preview.hits.map((hit, i) => {
                    const doc = hit.document;
                    const id = String(doc.id ?? "");
                    const isPinned = hit.pinned;
                    const isExcluded = excludes.some((e) => e.id === id);
                    const title = (doc.name || doc.title || doc.productName || doc.label || id) as string;
                    const image = (doc.image_link || doc.image || doc.thumbnail || doc.image_url || "") as string;
                    const price = doc.price as number | undefined;
                    const salePrice = doc.sale_price as number | undefined;
                    const brand = (doc.brand || "") as string;
                    const availability = (doc.availability || "") as string;

                    return (
                      <div
                        key={`${id}-${i}`}
                        className={`rounded-lg border p-3 transition-colors ${
                          isPinned
                            ? "border-green-200 bg-green-50/50"
                            : isExcluded
                            ? "border-red-200 bg-red-50/50 opacity-50"
                            : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-mono text-gray-400 pt-0.5 w-5 text-right flex-shrink-0">{i + 1}</span>
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {image ? (
                              <img
                                src={image}
                                alt={title}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                              />
                            ) : null}
                            <div className={`text-gray-300 ${image ? "hidden" : ""}`}>
                              <ImageOff className="h-5 w-5" />
                            </div>
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm text-gray-900 truncate">{title}</span>
                              {isPinned && (
                                <Badge variant="success" className="flex items-center gap-0.5 text-[10px] flex-shrink-0">
                                  <Pin className="h-2.5 w-2.5" /> Pinned
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">{id}</span>
                              {brand && <span className="text-xs text-gray-500">{brand}</span>}
                              {salePrice ? (
                                <span className="text-xs font-semibold text-red-600">${salePrice.toFixed(2)}{price ? <span className="text-gray-400 line-through ml-1 font-normal">${price.toFixed(2)}</span> : null}</span>
                              ) : price ? (
                                <span className="text-xs font-semibold text-gray-900">${price.toFixed(2)}</span>
                              ) : null}
                              {availability && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  availability === "in stock" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {availability}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {preview.found > PREVIEW_PER_PAGE && (() => {
                const totalPages = Math.ceil(preview.found / PREVIEW_PER_PAGE);
                const maxVisible = 5;
                let startPage = Math.max(1, previewPage - Math.floor(maxVisible / 2));
                const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

                return (
                  <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => runPreview(previewPage - 1)}
                      disabled={previewPage <= 1}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {startPage > 1 && (
                      <>
                        <button onClick={() => runPreview(1)} className="px-2.5 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors">1</button>
                        {startPage > 2 && <span className="text-xs text-gray-400 px-1">&hellip;</span>}
                      </>
                    )}
                    {pages.map((p) => (
                      <button
                        key={p}
                        onClick={() => runPreview(p)}
                        className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                          p === previewPage
                            ? "bg-brand text-white font-medium"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    {endPage < totalPages && (
                      <>
                        {endPage < totalPages - 1 && <span className="text-xs text-gray-400 px-1">&hellip;</span>}
                        <button onClick={() => runPreview(totalPages)} className="px-2.5 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 transition-colors">{totalPages}</button>
                      </>
                    )}
                    <button
                      onClick={() => runPreview(previewPage + 1)}
                      disabled={previewPage >= totalPages}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-gray-400 ml-2">
                      Page {previewPage} of {totalPages}
                    </span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
