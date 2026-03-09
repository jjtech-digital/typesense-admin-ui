"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Eye, Save, ArrowLeft,
  Pin, Ban, Filter, ArrowUpDown, Replace, Calendar,
  Braces, StopCircle, Sparkles, CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

import type {
  IncludeEntry, ExcludeEntry, PreviewHit, PreviewResult,
  CollectionField, FilterRow, SortRow,
  CurationRuleEditorProps, ConditionKey, ConsequenceKey, SectionKey, SidebarItem,
} from "@/components/overrides/curation-rule-types";
import { parseFilterString, filterRowsToString, parseSortString, sortRowsToString } from "@/components/overrides/filter-sort-utils";
import { Toggle } from "@/components/overrides/Toggle";
import { PreviewPanel } from "@/components/overrides/PreviewPanel";
import { SectionFormPanel } from "@/components/overrides/SectionFormPanel";

// ── Sidebar items ────────────────────────────────────────────────────

const conditionItems: SidebarItem[] = [
  { key: "query", label: "Query condition", icon: <Search className="h-4 w-4" /> },
  { key: "dateRange", label: "Date range", icon: <Calendar className="h-4 w-4" /> },
];

const consequenceItems: SidebarItem[] = [
  { key: "pinItems", label: "Pin items", icon: <Pin className="h-4 w-4" /> },
  { key: "hideItems", label: "Hide items", icon: <Ban className="h-4 w-4" /> },
  { key: "filterResults", label: "Filter results", icon: <Filter className="h-4 w-4" /> },
  { key: "sortResults", label: "Sort results", icon: <ArrowUpDown className="h-4 w-4" /> },
  { key: "replaceQuery", label: "Replace query", icon: <Replace className="h-4 w-4" /> },
  { key: "removeTokens", label: "Remove matched tokens", icon: <Sparkles className="h-4 w-4" /> },
  { key: "filterCurated", label: "Filter curated hits", icon: <CheckSquare className="h-4 w-4" /> },
  { key: "metadata", label: "Custom metadata", icon: <Braces className="h-4 w-4" /> },
  { key: "stopProcessing", label: "Stop processing", icon: <StopCircle className="h-4 w-4" /> },
];

// ── Main Component ───────────────────────────────────────────────────

export function CurationRuleEditor({ collectionName, editOverride }: CurationRuleEditorProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const { getConfig, getBaseUrl, getHeaders } = useConnectionConfig();

  // Active section
  const [activeSection, setActiveSection] = useState<SectionKey>("query");

  // Enabled consequences (conditions always visible)
  const [enabledSections, setEnabledSections] = useState<Set<ConsequenceKey>>(new Set());

  // Collection schema
  const [schemaFields, setSchemaFields] = useState<CollectionField[]>([]);
  const [queryByFields, setQueryByFields] = useState("");

  // Form state
  const [overrideId, setOverrideId] = useState("");
  const [query, setQuery] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains">("exact");
  const [ruleFilterRows, setRuleFilterRows] = useState<FilterRow[]>([]);
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [sortRows, setSortRows] = useState<SortRow[]>([]);
  const [replaceQueryVal, setReplaceQueryVal] = useState("");
  const [removeMatchedTokens, setRemoveMatchedTokens] = useState(true);
  const [filterCuratedHits, setFilterCuratedHits] = useState(false);
  const [metadataJson, setMetadataJson] = useState("");
  const [stopProcessing, setStopProcessing] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [includes, setIncludes] = useState<IncludeEntry[]>([]);
  const [excludes, setExcludes] = useState<ExcludeEntry[]>([]);
  const [includeId, setIncludeId] = useState("");
  const [includePos, setIncludePos] = useState("1");
  const [excludeId, setExcludeId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview state
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"grid" | "list">("grid");
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearchQuery, setPreviewSearchQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const PREVIEW_PER_PAGE = 20;

  // Fetch collection schema
  const fetchSchemaRef = useRef(false);
  useEffect(() => {
    if (fetchSchemaRef.current) return;
    fetchSchemaRef.current = true;
    const fetchSchema = async () => {
      try {
        const cfg = getConfig();
        const baseUrl = getBaseUrl();
        if (!cfg || !baseUrl) return;
        const res = await fetch(
          `${baseUrl}/collections/${encodeURIComponent(collectionName)}`,
          { headers: { "X-TYPESENSE-API-KEY": cfg.apiKey } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const fields: CollectionField[] = (data.fields || []).map(
          (f: CollectionField) => ({ name: f.name, type: f.type, facet: f.facet, sort: f.sort, index: f.index })
        );
        setSchemaFields(fields);

        const stringFields = fields
          .filter((f) =>
            (f.type === "string" || f.type === "string[]") &&
            f.index !== false &&
            !f.name.startsWith("_") &&
            !["image_link", "additional_image_link", "link"].includes(f.name)
          )
          .map((f) => f.name);
        setQueryByFields(stringFields.join(",") || "title");
      } catch {
        setQueryByFields("title");
      }
    };
    fetchSchema();
  }, [collectionName, getConfig, getBaseUrl]);

  // Helper to convert unix timestamp to datetime-local value
  const tsToDatetime = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 16);
  const datetimeToTs = (val: string) => val ? Math.floor(new Date(val).getTime() / 1000) : undefined;

  // Initialize form when editing — needs schemaFields loaded
  const initDone = useRef(false);
  useEffect(() => {
    if (!editOverride || initDone.current) return;
    // Wait for schema to load for proper parsing
    if (schemaFields.length === 0) return;
    initDone.current = true;

    setOverrideId(editOverride.id);
    setQuery(editOverride.rule.query);
    setMatchType(editOverride.rule.match);
    setRuleFilterRows(parseFilterString(editOverride.rule.filter_by || "", schemaFields));
    setFilterRows(parseFilterString(editOverride.filter_by || "", schemaFields));
    setSortRows(parseSortString(editOverride.sort_by || ""));
    setReplaceQueryVal(editOverride.replace_query || "");
    setRemoveMatchedTokens(editOverride.remove_matched_tokens !== false);
    setFilterCuratedHits(editOverride.filter_curated_hits === true);
    setStopProcessing(editOverride.stop_processing !== false);
    setIncludes(editOverride.includes || []);
    setExcludes(editOverride.excludes || []);
    if (editOverride.effective_from_ts) setEffectiveFrom(tsToDatetime(editOverride.effective_from_ts));
    if (editOverride.effective_to_ts) setEffectiveTo(tsToDatetime(editOverride.effective_to_ts));
    if (editOverride.metadata) {
      try { setMetadataJson(JSON.stringify(editOverride.metadata, null, 2)); } catch { /* skip */ }
    }

    const enabled = new Set<ConsequenceKey>();
    if (editOverride.includes?.length) enabled.add("pinItems");
    if (editOverride.excludes?.length) enabled.add("hideItems");
    if (editOverride.filter_by) enabled.add("filterResults");
    if (editOverride.sort_by) enabled.add("sortResults");
    if (editOverride.replace_query) enabled.add("replaceQuery");
    if (editOverride.remove_matched_tokens === false) enabled.add("removeTokens");
    if (editOverride.filter_curated_hits) enabled.add("filterCurated");
    if (editOverride.metadata) enabled.add("metadata");
    if (editOverride.stop_processing !== undefined) enabled.add("stopProcessing");
    setEnabledSections(enabled);
  }, [editOverride, schemaFields]);

  const toggleSection = useCallback((key: ConsequenceKey) => {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Validation
  // Check if any consequence has actual data
  const hasConsequence = () => {
    if (enabledSections.has("pinItems") && includes.length > 0) return true;
    if (enabledSections.has("hideItems") && excludes.length > 0) return true;
    if (enabledSections.has("filterResults") && filterRows.length > 0) return true;
    if (enabledSections.has("sortResults") && sortRows.length > 0) return true;
    if (enabledSections.has("replaceQuery") && replaceQueryVal.trim()) return true;
    if (enabledSections.has("removeTokens")) return true;
    if (enabledSections.has("filterCurated")) return true;
    if (enabledSections.has("metadata") && metadataJson.trim()) return true;
    if (enabledSections.has("stopProcessing")) return true;
    return false;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!query.trim()) errs.query = "Query is required";
    if (!hasConsequence()) errs.consequence = "At least one consequence is required (e.g. pin items, filter, sort, etc.)";
    if (enabledSections.has("metadata") && metadataJson.trim()) {
      try { JSON.parse(metadataJson); } catch { errs.metadata = "Invalid JSON"; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const activeConsequenceCount = enabledSections.size;

  // Derived filter/sort strings
  const filterByString = filterRowsToString(filterRows);
  const sortByString = sortRowsToString(sortRows);
  const ruleFilterByString = filterRowsToString(ruleFilterRows);

  // ── Preview ────────────────────────────────────────────────────────

  const runPreview = useCallback(async (page = 1) => {
    const effectiveQuery = previewSearchQuery.trim() || query.trim();
    if (!effectiveQuery) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const cfg = getConfig();
      const baseUrl = getBaseUrl();
      if (!cfg || !baseUrl) throw new Error("Not connected");

      const searchQuery = previewSearchQuery.trim()
        ? previewSearchQuery.trim()
        : (enabledSections.has("replaceQuery") && replaceQueryVal.trim()) || query.trim();
      const params = new URLSearchParams({
        q: searchQuery,
        query_by: queryByFields || "title",
        per_page: String(PREVIEW_PER_PAGE),
        page: String(page),
      });
      if (enabledSections.has("filterResults") && filterByString) params.set("filter_by", filterByString);
      if (enabledSections.has("sortResults") && sortByString) params.set("sort_by", sortByString);

      const res = await fetch(
        `${baseUrl}/collections/${encodeURIComponent(collectionName)}/documents/search?${params}`,
        {
          headers: { "X-TYPESENSE-API-KEY": cfg.apiKey },
          signal: abortRef.current.signal,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Search failed");

      let hits: PreviewHit[] = (data.hits || []).map((h: PreviewHit) => ({ ...h }));

      // Remove excluded docs
      if (enabledSections.has("hideItems") && excludes.length > 0) {
        const excludeIds = new Set(excludes.map((e) => e.id));
        hits = hits.filter((h) => !excludeIds.has(String(h.document.id)));
      }

      // Pin included docs (only on first page)
      if (page === 1 && enabledSections.has("pinItems") && includes.length > 0) {
        const pinnedDocs: PreviewHit[] = [];
        for (const inc of includes) {
          const existing = hits.find((h) => String(h.document.id) === inc.id);
          if (existing) {
            hits = hits.filter((h) => String(h.document.id) !== inc.id);
            pinnedDocs.push({ ...existing, pinned: true });
          } else {
            try {
              const docRes = await fetch(
                `${baseUrl}/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(inc.id)}`,
                { headers: { "X-TYPESENSE-API-KEY": cfg.apiKey } }
              );
              if (docRes.ok) {
                const doc = await docRes.json();
                pinnedDocs.push({ document: doc, pinned: true });
              }
            } catch { /* skip */ }
          }
        }
        const sorted = [...includes].sort((a, b) => a.position - b.position);
        const result: PreviewHit[] = [...hits];
        for (const inc of sorted) {
          const pinDoc = pinnedDocs.find((p) => String(p.document.id) === inc.id);
          if (pinDoc) result.splice(Math.max(0, inc.position - 1), 0, pinDoc);
        }
        hits = result;
      }

      setPreview({ found: data.found, hits, search_time_ms: data.search_time_ms });
      setPreviewPage(page);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setPreviewError(err instanceof Error ? err.message : "Preview failed");
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [query, previewSearchQuery, queryByFields, filterByString, sortByString, replaceQueryVal, enabledSections, includes, excludes, collectionName, getConfig, getBaseUrl]);

  // Auto-preview: debounce on form changes
  const autoPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const effectiveQuery = previewSearchQuery.trim() || query.trim();
    if (!effectiveQuery || !queryByFields) return;
    if (autoPreviewTimer.current) clearTimeout(autoPreviewTimer.current);
    autoPreviewTimer.current = setTimeout(() => {
      runPreview(1);
    }, 500);
    return () => { if (autoPreviewTimer.current) clearTimeout(autoPreviewTimer.current); };
  }, [query, previewSearchQuery, filterByString, sortByString, replaceQueryVal, enabledSections, includes, excludes, queryByFields]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const rule: Record<string, unknown> = { query: query.trim(), match: matchType };
      if (ruleFilterByString) rule.filter_by = ruleFilterByString;

      const overrideData: Record<string, unknown> = {
        rule,
        // Always include these booleans (Typesense v30 requires at least one consequence field)
        remove_matched_tokens: enabledSections.has("removeTokens") ? removeMatchedTokens : false,
        stop_processing: enabledSections.has("stopProcessing") ? stopProcessing : true,
      };

      if (enabledSections.has("pinItems") && includes.length > 0) overrideData.includes = includes;
      if (enabledSections.has("hideItems") && excludes.length > 0) overrideData.excludes = excludes;
      if (enabledSections.has("filterResults") && filterByString) overrideData.filter_by = filterByString;
      if (enabledSections.has("sortResults") && sortByString) overrideData.sort_by = sortByString;
      if (enabledSections.has("replaceQuery") && replaceQueryVal.trim()) overrideData.replace_query = replaceQueryVal.trim();
      if (enabledSections.has("filterCurated")) overrideData.filter_curated_hits = filterCuratedHits;

      const fromTs = datetimeToTs(effectiveFrom);
      const toTs = datetimeToTs(effectiveTo);
      if (fromTs) overrideData.effective_from_ts = fromTs;
      if (toTs) overrideData.effective_to_ts = toTs;

      if (enabledSections.has("metadata") && metadataJson.trim()) {
        overrideData.metadata = JSON.parse(metadataJson);
      }

      const id = editOverride?.id || overrideId || `override-${Date.now()}`;
      const url = editOverride
        ? `/api/collections/${collectionName}/overrides/${editOverride.id}`
        : `/api/collections/${collectionName}/overrides`;
      const method = editOverride ? "PUT" : "POST";
      const body = editOverride ? overrideData : { id, ...overrideData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save curation rule");

      success(editOverride ? "Curation rule updated" : "Curation rule created");
      router.push(`/collections/${collectionName}/rules`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save curation rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <Link href={`/collections/${collectionName}/rules`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => runPreview(1)} loading={previewLoading} disabled={!query.trim()} size="sm">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting} size="sm">
            <Save className="h-4 w-4" />
            {editOverride ? "Update Rule" : "Save Rule"}
          </Button>
        </div>
      </div>

      {/* Validation banner */}
      {errors.consequence && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {errors.consequence}
        </div>
      )}
      {!errors.consequence && !query.trim() && activeConsequenceCount === 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          A rule should have at least one condition and one consequence in order to be saved.
        </div>
      )}

      {/* 3-panel layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Left: Sidebar ──────────────────────────────────────── */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Conditions</h3>
            <div className="space-y-1">
              {conditionItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                    activeSection === item.key
                      ? "bg-brand/10 text-brand font-medium border border-brand/20"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className={activeSection === item.key ? "text-brand" : "text-gray-400"}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Consequences</h3>
            <div className="space-y-1">
              {consequenceItems.map((item) => {
                const cKey = item.key as ConsequenceKey;
                const isEnabled = enabledSections.has(cKey);
                const isActive = activeSection === item.key;
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveSection(item.key); if (!isEnabled) toggleSection(cKey); }}
                      className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                        isActive
                          ? "bg-brand/10 text-brand font-medium border border-brand/20"
                          : isEnabled
                          ? "text-gray-900 bg-gray-50"
                          : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                      }`}
                    >
                      <span className={isActive ? "text-brand" : isEnabled ? "text-gray-600" : "text-gray-300"}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                    <Toggle checked={isEnabled} onChange={() => toggleSection(cKey)} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Middle: Form ───────────────────────────────────────── */}
        <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 min-h-[300px]">
            <SectionFormPanel
              activeSection={activeSection}
              query={query}
              setQuery={setQuery}
              matchType={matchType}
              setMatchType={setMatchType}
              overrideId={overrideId}
              setOverrideId={setOverrideId}
              editOverride={editOverride}
              errors={errors}
              effectiveFrom={effectiveFrom}
              setEffectiveFrom={setEffectiveFrom}
              effectiveTo={effectiveTo}
              setEffectiveTo={setEffectiveTo}
              includes={includes}
              setIncludes={setIncludes}
              includeId={includeId}
              setIncludeId={setIncludeId}
              includePos={includePos}
              setIncludePos={setIncludePos}
              excludes={excludes}
              setExcludes={setExcludes}
              excludeId={excludeId}
              setExcludeId={setExcludeId}
              filterRows={filterRows}
              setFilterRows={setFilterRows}
              filterByString={filterByString}
              sortRows={sortRows}
              setSortRows={setSortRows}
              sortByString={sortByString}
              enabledSections={enabledSections}
              toggleSection={toggleSection}
              ruleFilterRows={ruleFilterRows}
              setRuleFilterRows={setRuleFilterRows}
              replaceQueryVal={replaceQueryVal}
              setReplaceQueryVal={setReplaceQueryVal}
              removeMatchedTokens={removeMatchedTokens}
              setRemoveMatchedTokens={setRemoveMatchedTokens}
              filterCuratedHits={filterCuratedHits}
              setFilterCuratedHits={setFilterCuratedHits}
              stopProcessing={stopProcessing}
              setStopProcessing={setStopProcessing}
              metadataJson={metadataJson}
              setMetadataJson={setMetadataJson}
              schemaFields={schemaFields}
            />
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────── */}
        <PreviewPanel
          preview={preview}
          previewLoading={previewLoading}
          previewError={previewError}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          previewPage={previewPage}
          previewSearchQuery={previewSearchQuery}
          setPreviewSearchQuery={setPreviewSearchQuery}
          query={query}
          excludes={excludes}
          runPreview={runPreview}
        />
      </div>
    </div>
  );
}
