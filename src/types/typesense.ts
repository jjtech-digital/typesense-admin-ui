export type TypesenseFieldType =
  | "string"
  | "int32"
  | "int64"
  | "float"
  | "bool"
  | "geopoint"
  | "string[]"
  | "int32[]"
  | "int64[]"
  | "float[]"
  | "bool[]"
  | "geopoint[]"
  | "auto"
  | "object"
  | "object[]"
  | "image"
  | "string*";

export interface TypesenseField {
  name: string;
  type: TypesenseFieldType;
  facet?: boolean;
  optional?: boolean;
  index?: boolean;
  sort?: boolean;
  infix?: boolean;
  locale?: string;
  store?: boolean;
  stem?: boolean;
  num_dim?: number;
  vec_dist?: "cosine" | "ip";
  range_index?: boolean;
  reference?: string;
  drop?: boolean;
}

export interface TypesenseCollection {
  name: string;
  num_documents: number;
  fields: TypesenseField[];
  default_sorting_field?: string;
  created_at?: number;
  enable_nested_fields?: boolean;
  token_separators?: string[];
  symbols_to_index?: string[];
}

export interface TypesenseCollectionCreate {
  name: string;
  fields: TypesenseField[];
  default_sorting_field?: string;
  enable_nested_fields?: boolean;
  token_separators?: string[];
  symbols_to_index?: string[];
}

export interface TypesenseDocument {
  id: string;
  [key: string]: unknown;
}

export interface TypesenseSearchResult {
  found: number;
  out_of: number;
  page: number;
  hits: TypesenseHit[];
  facet_counts?: TypesenseFacetCount[];
  search_time_ms: number;
  request_params: {
    collection_name: string;
    per_page: number;
    q: string;
  };
}

export interface TypesenseHit {
  document: TypesenseDocument;
  highlight?: Record<string, TypesenseHighlight>;
  highlights?: TypesenseHighlight[];
  text_match?: number;
}

export interface TypesenseHighlight {
  field: string;
  snippet?: string;
  value?: string;
  matched_tokens?: string[];
}

export interface TypesenseFacetCount {
  field_name: string;
  counts: {
    count: number;
    highlighted: string;
    value: string;
  }[];
  stats?: {
    avg?: number;
    max?: number;
    min?: number;
    sum?: number;
  };
}

// Synonym Sets API (Typesense v30+)
// Global synonym sets independent of collections.
// Collections reference sets via the synonym_sets field.

export interface SynonymItem {
  id: string;
  synonyms: string[];
  root?: string;           // present → one-way synonym
  locale?: string;
  symbols_to_index?: string[];
}

export interface SynonymSet {
  name: string;
  items: SynonymItem[];
}

export interface SynonymItemCreate {
  synonyms: string[];
  root?: string;
  locale?: string;
  symbols_to_index?: string[];
}

export interface SynonymSetCreate {
  items: SynonymItemCreate[];
}

export type SynonymType = "one-way" | "multi-way";

// Legacy alias kept for any remaining references
export type TypesenseSynonym = SynonymItem;

export interface TypesenseOverride {
  id: string;
  rule: {
    query: string;
    match: "exact" | "contains";
  };
  includes?: {
    id: string;
    position: number;
  }[];
  excludes?: {
    id: string;
  }[];
  filter_by?: string;
  sort_by?: string;
  replace_query?: string;
  remove_matched_tokens?: boolean;
  effect_duration_days?: number;
  stop_processing?: boolean;
}

export interface TypesenseOverrideCreate {
  rule: {
    query: string;
    match: "exact" | "contains";
  };
  includes?: {
    id: string;
    position: number;
  }[];
  excludes?: {
    id: string;
  }[];
  filter_by?: string;
  sort_by?: string;
  replace_query?: string;
  remove_matched_tokens?: boolean;
  stop_processing?: boolean;
}

export interface TypesenseApiKey {
  id?: number;
  value?: string;
  description: string;
  actions: string[];
  collections: string[];
  expires_at?: number;
}

export interface TypesenseApiKeyCreate {
  description: string;
  actions: string[];
  collections: string[];
  expires_at?: number;
}

export interface TypesenseHealth {
  ok: boolean;
}

export interface TypesenseStats {
  latency_ms?: Record<string, number>;
  requests_per_second?: Record<string, number>;
  pending_write_batches?: number;
  total_collections?: number;
}

export interface TypesenseMetrics {
  system_cpu1_active_percentage?: string;
  system_cpu2_active_percentage?: string;
  system_disk_total_bytes?: string;
  system_disk_used_bytes?: string;
  system_memory_total_bytes?: string;
  system_memory_used_bytes?: string;
  system_network_received_bytes?: string;
  system_network_sent_bytes?: string;
  typesense_memory_active_bytes?: string;
  typesense_memory_allocated_bytes?: string;
  typesense_memory_fragmentation_ratio?: string;
  typesense_memory_mapped_bytes?: string;
  typesense_memory_metadata_bytes?: string;
  typesense_memory_resident_bytes?: string;
  typesense_memory_retained_bytes?: string;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
}

export interface ApiError {
  message: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
