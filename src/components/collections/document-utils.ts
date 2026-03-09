// ── Image detection ────────────────────────────────────────────────────────────

export const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif|avif|svg|bmp|tiff?)(\?.*)?$/i;

/** Priority field names checked first (case-insensitive) */
export const IMAGE_FIELD_PATTERNS = /^(image|images|img|photo|picture|thumbnail|cover|gallery|featuredImage|mainImage|primaryImage|productImage|displayImage|heroImage|banner|logo|avatar|icon)/i;

export function isImageUrl(val: string): boolean {
  return IMAGE_EXT_RE.test(val);
}

export function looksLikeUrl(val: string): boolean {
  return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//");
}

/**
 * Deep-scan any value for the first image URL.
 * Recurses into objects and arrays up to `maxDepth` levels.
 */
export function extractImageUrl(val: unknown, depth: number): string | null {
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

export function findFirstImage(doc: Record<string, unknown>): string | null {
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

// ── Primary field detection ────────────────────────────────────────────────────

export const TITLE_FIELDS = ["name", "title", "productName", "label", "displayName", "heading", "subject"];
export const SUBTITLE_FIELDS = ["sku", "productCode", "code", "reference", "slug", "url"];
export const PRICE_FIELDS = ["price", "salePrice", "regularPrice", "cost", "amount"];

export function findField(doc: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    const v = doc[key];
    if (v !== null && v !== undefined && v !== "") return key;
  }
  return null;
}

// ── Filter builder ─────────────────────────────────────────────────────────────

export type RangeFilter = { min: number; max: number };

export function buildFilterBy(
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

export const PER_PAGE = 25;

// ── Numeric field type detection ──────────────────────────────────────────────

export const NUMERIC_TYPES = new Set(["int32", "int64", "float", "int32[]", "int64[]", "float[]"]);

// ── Facet count interface ─────────────────────────────────────────────────────

export interface FacetCount {
  field_name: string;
  counts: { value: string; count: number }[];
  stats?: { avg?: number; max?: number; min?: number; sum?: number };
}

// ── Display constants ─────────────────────────────────────────────────────────

export const SHOWN_FIELDS = 10;
export const INITIAL_VISIBLE = 8;
