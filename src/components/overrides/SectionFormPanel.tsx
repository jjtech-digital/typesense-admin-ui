"use client";

import React from "react";
import { X, Plus, Pin, Ban, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import type {
  IncludeEntry, ExcludeEntry,
  CollectionField, FilterRow, SortRow,
  SectionKey, ConsequenceKey,
} from "@/components/overrides/curation-rule-types";
import { filterRowsToString, sortRowsToString } from "@/components/overrides/filter-sort-utils";
import { Toggle } from "@/components/overrides/Toggle";
import { FilterBuilder } from "@/components/overrides/FilterBuilder";
import { SortBuilder } from "@/components/overrides/SortBuilder";

import type { TypesenseOverride } from "@/types/typesense";

export interface SectionFormPanelProps {
  activeSection: SectionKey;
  // query section
  query: string;
  setQuery: (v: string) => void;
  matchType: "exact" | "contains";
  setMatchType: (v: "exact" | "contains") => void;
  overrideId: string;
  setOverrideId: (v: string) => void;
  editOverride: TypesenseOverride | null | undefined;
  errors: Record<string, string>;
  // date range
  effectiveFrom: string;
  setEffectiveFrom: (v: string) => void;
  effectiveTo: string;
  setEffectiveTo: (v: string) => void;
  // pin items
  includes: IncludeEntry[];
  setIncludes: React.Dispatch<React.SetStateAction<IncludeEntry[]>>;
  includeId: string;
  setIncludeId: (v: string) => void;
  includePos: string;
  setIncludePos: (v: string) => void;
  // hide items
  excludes: ExcludeEntry[];
  setExcludes: React.Dispatch<React.SetStateAction<ExcludeEntry[]>>;
  excludeId: string;
  setExcludeId: (v: string) => void;
  // filter results
  filterRows: FilterRow[];
  setFilterRows: (rows: FilterRow[]) => void;
  filterByString: string;
  // sort results
  sortRows: SortRow[];
  setSortRows: (rows: SortRow[]) => void;
  sortByString: string;
  enabledSections: Set<ConsequenceKey>;
  toggleSection: (key: ConsequenceKey) => void;
  // rule condition filters/sort
  ruleFilterRows: FilterRow[];
  setRuleFilterRows: (rows: FilterRow[]) => void;
  // replace query
  replaceQueryVal: string;
  setReplaceQueryVal: (v: string) => void;
  // toggles
  removeMatchedTokens: boolean;
  setRemoveMatchedTokens: (v: boolean) => void;
  filterCuratedHits: boolean;
  setFilterCuratedHits: (v: boolean) => void;
  stopProcessing: boolean;
  setStopProcessing: (v: boolean) => void;
  // metadata
  metadataJson: string;
  setMetadataJson: (v: string) => void;
  // schema
  schemaFields: CollectionField[];
}

export function SectionFormPanel({
  activeSection,
  query, setQuery,
  matchType, setMatchType,
  overrideId, setOverrideId,
  editOverride,
  errors,
  effectiveFrom, setEffectiveFrom,
  effectiveTo, setEffectiveTo,
  includes, setIncludes,
  includeId, setIncludeId,
  includePos, setIncludePos,
  excludes, setExcludes,
  excludeId, setExcludeId,
  filterRows, setFilterRows,
  filterByString,
  sortRows, setSortRows,
  sortByString,
  enabledSections, toggleSection,
  ruleFilterRows, setRuleFilterRows,
  replaceQueryVal, setReplaceQueryVal,
  removeMatchedTokens, setRemoveMatchedTokens,
  filterCuratedHits, setFilterCuratedHits,
  stopProcessing, setStopProcessing,
  metadataJson, setMetadataJson,
  schemaFields,
}: SectionFormPanelProps) {
  const addInclude = () => {
    if (includeId.trim()) {
      setIncludes((prev) => [...prev, { id: includeId.trim(), position: parseInt(includePos, 10) || 1 }]);
      setIncludeId("");
      setIncludePos("1");
    }
  };

  const addExclude = () => {
    if (excludeId.trim()) {
      setExcludes((prev) => [...prev, { id: excludeId.trim() }]);
      setExcludeId("");
    }
  };

  switch (activeSection) {
    case "query":
      return (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Define the condition that triggers the rule</h3>
            <p className="text-xs text-gray-500 mb-4">When a search matches this condition, the consequences below will be applied.</p>
          </div>

          {/* Query + match */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Your search</label>
            <div className="flex gap-2">
              <div className="w-[110px] flex-shrink-0">
                <Select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as "exact" | "contains")}
                  options={[
                    { value: "exact", label: "is" },
                    { value: "contains", label: "contains" },
                  ]}
                />
              </div>
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. iPhone"
                  error={errors.query}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">If nothing is typed, the query will be considered as &ldquo;empty&rdquo;.</p>
          </div>

          {/* Filters (rule condition) */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filters</span>
              <span className="text-[10px] text-gray-400">(optional condition trigger)</span>
            </div>
            <FilterBuilder
              rows={ruleFilterRows}
              onChange={setRuleFilterRows}
              fields={schemaFields}
            />
            {ruleFilterRows.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-2 font-mono bg-gray-50 rounded px-2 py-1 break-all">
                {filterRowsToString(ruleFilterRows)}
              </p>
            )}
          </div>

          {/* Sort (consequence shortcut in conditions) */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sort override</span>
              <span className="text-[10px] text-gray-400">(optional)</span>
            </div>
            <SortBuilder
              rows={sortRows}
              onChange={(rows) => {
                setSortRows(rows);
                if (rows.length > 0 && !enabledSections.has("sortResults")) {
                  toggleSection("sortResults");
                }
              }}
              fields={schemaFields}
            />
            {sortRows.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-2 font-mono bg-gray-50 rounded px-2 py-1">
                {sortRowsToString(sortRows)}
              </p>
            )}
          </div>

          {/* Rule ID */}
          {!editOverride && (
            <div className="border-t border-gray-100 pt-4">
              <Input
                label="Rule ID (optional)"
                value={overrideId}
                onChange={(e) => setOverrideId(e.target.value)}
                placeholder="Auto-generated if empty"
                helperText="A unique identifier for this curation rule"
              />
            </div>
          )}
        </div>
      );

    case "dateRange":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Schedule when this rule is active</h3>
            <p className="text-xs text-gray-500 mb-4">Optionally limit this rule to a date/time window. Leave empty for always active.</p>
          </div>
          <Input label="Active from" type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} helperText="Rule starts applying from this date/time" />
          <Input label="Active until" type="datetime-local" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} helperText="Rule stops applying after this date/time" />
        </div>
      );

    case "pinItems":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Pin items to positions</h3>
            <p className="text-xs text-gray-500 mb-4">Pin specific documents to exact positions in search results.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input value={includeId} onChange={(e) => setIncludeId(e.target.value)} placeholder="Document ID" onKeyDown={(e) => e.key === "Enter" && addInclude()} />
            </div>
            <div className="w-20">
              <input type="number" min="1" value={includePos} onChange={(e) => setIncludePos(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addInclude()} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Pos" />
            </div>
            <Button variant="outline" size="sm" onClick={addInclude}><Plus className="h-4 w-4" /></Button>
          </div>
          {includes.length > 0 ? (
            <div className="space-y-1.5">
              {includes.map((inc, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <Pin className="h-3.5 w-3.5 text-green-600" />
                    <span className="font-mono text-xs">{inc.id}</span>
                    <Badge variant="success" className="text-[10px]">pos {inc.position}</Badge>
                  </div>
                  <button onClick={() => setIncludes((p) => p.filter((_, j) => j !== i))} className="text-green-400 hover:text-green-700"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No pinned items yet. Add a document ID and position above.</p>
          )}
        </div>
      );

    case "hideItems":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Hide items from results</h3>
            <p className="text-xs text-gray-500 mb-4">Exclude specific documents from appearing in search results.</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input value={excludeId} onChange={(e) => setExcludeId(e.target.value)} placeholder="Document ID to exclude" onKeyDown={(e) => e.key === "Enter" && addExclude()} />
            </div>
            <Button variant="outline" size="sm" onClick={addExclude}><Plus className="h-4 w-4" /></Button>
          </div>
          {excludes.length > 0 ? (
            <div className="space-y-1.5">
              {excludes.map((exc, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <Ban className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-mono text-xs">{exc.id}</span>
                  </div>
                  <button onClick={() => setExcludes((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No hidden items yet. Add document IDs above.</p>
          )}
        </div>
      );

    case "filterResults":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Filter results</h3>
            <p className="text-xs text-gray-500 mb-4">Apply an additional filter clause when this rule matches.</p>
          </div>
          <FilterBuilder
            rows={filterRows}
            onChange={setFilterRows}
            fields={schemaFields}
            label="Filter conditions"
          />
          {filterRows.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded px-2 py-1.5 break-all border border-gray-100">
                {filterByString}
              </p>
            </div>
          )}
        </div>
      );

    case "sortResults":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sort results</h3>
            <p className="text-xs text-gray-500 mb-4">Override the sort order when this curation rule matches.</p>
          </div>
          <SortBuilder
            rows={sortRows}
            onChange={setSortRows}
            fields={schemaFields}
            label="Sort fields"
          />
          {sortRows.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded px-2 py-1.5 break-all border border-gray-100">
                {sortByString}
              </p>
            </div>
          )}
        </div>
      );

    case "replaceQuery":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Replace query</h3>
            <p className="text-xs text-gray-500 mb-4">Replace the original search query with an alternative when this rule matches.</p>
          </div>
          <Input label="Replacement query" value={replaceQueryVal} onChange={(e) => setReplaceQueryVal(e.target.value)} placeholder="e.g., smartphone" helperText="The original query will be replaced with this value" />
        </div>
      );

    case "removeTokens":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Remove matched tokens</h3>
            <p className="text-xs text-gray-500 mb-4">When enabled, tokens from the curation rule query are removed from the search query.</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Toggle checked={removeMatchedTokens} onChange={setRemoveMatchedTokens} />
            <span className="text-sm text-gray-700">{removeMatchedTokens ? "Matched tokens will be removed" : "Matched tokens will be kept"}</span>
          </div>
        </div>
      );

    case "filterCurated":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Filter curated hits</h3>
            <p className="text-xs text-gray-500 mb-4">When enabled, the filter conditions of the query are also applied to curated/pinned hits.</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Toggle checked={filterCuratedHits} onChange={setFilterCuratedHits} />
            <span className="text-sm text-gray-700">{filterCuratedHits ? "Query filters apply to curated hits" : "Curated hits bypass query filters"}</span>
          </div>
        </div>
      );

    case "metadata":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Custom metadata</h3>
            <p className="text-xs text-gray-500 mb-4">Return custom JSON data in the search API response when this rule is triggered.</p>
          </div>
          <Textarea label="JSON metadata" value={metadataJson} onChange={(e) => setMetadataJson(e.target.value)} placeholder={'{\n  "banner": "Summer Sale!",\n  "banner_url": "/sale"\n}'} error={errors.metadata} helperText="Must be valid JSON" rows={6} className="font-mono text-xs" />
        </div>
      );

    case "stopProcessing":
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Stop processing</h3>
            <p className="text-xs text-gray-500 mb-4">When enabled, no further curation rules will be applied after this one matches.</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Toggle checked={stopProcessing} onChange={setStopProcessing} />
            <span className="text-sm text-gray-700">{stopProcessing ? "Stop after this rule" : "Continue processing subsequent rules"}</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
