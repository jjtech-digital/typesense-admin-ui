import type React from "react";
import type { TypesenseOverride } from "@/types/typesense";

// ── Types ────────────────────────────────────────────────────────────

export interface IncludeEntry { id: string; position: number }
export interface ExcludeEntry { id: string }

export interface PreviewHit {
  document: Record<string, unknown>;
  highlight?: Record<string, unknown>;
  text_match?: number;
  pinned?: boolean;
}

export interface PreviewResult {
  found: number;
  hits: PreviewHit[];
  search_time_ms: number;
}

export interface CollectionField {
  name: string;
  type: string;
  facet?: boolean;
  sort?: boolean;
  index?: boolean;
}

export interface FilterRow {
  field: string;
  operator: string;
  value: string;
  connector: "&&" | "||";
}

export interface SortRow {
  field: string;
  direction: "asc" | "desc";
}

export interface CurationRuleEditorProps {
  collectionName: string;
  editOverride?: TypesenseOverride | null;
}

// ── Sidebar items ────────────────────────────────────────────────────

export type ConditionKey = "query" | "dateRange";
export type ConsequenceKey = "pinItems" | "hideItems" | "filterResults" | "sortResults" | "replaceQuery" | "removeTokens" | "filterCurated" | "metadata" | "stopProcessing";
export type SectionKey = ConditionKey | ConsequenceKey;

export interface SidebarItem {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
}
