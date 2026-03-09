import type { CollectionField, FilterRow, SortRow } from "@/components/overrides/curation-rule-types";

// ── Parse / serialize helpers ────────────────────────────────────────

export function parseFilterString(str: string, fields: CollectionField[]): FilterRow[] {
  if (!str.trim()) return [];
  const fieldMap = new Map(fields.map((f) => [f.name, f]));
  const rows: FilterRow[] = [];

  // Split by && or || while preserving the connector
  const parts = str.split(/\s*(&&|\|\|)\s*/);
  for (let i = 0; i < parts.length; i += 2) {
    const part = parts[i]?.trim();
    if (!part) continue;
    const connector = (parts[i + 1] as "&&" | "||") || "&&";

    // Parse: field:operator value  or  field:operator[value]
    const match = part.match(/^(\w+)(:\[|:!=|:>=|:<=|:>|:<|:=)\s*(.*)$/);
    if (match) {
      const [, field, operator, value] = match;
      rows.push({ field, operator, value: value.replace(/^\[|\]$/g, "").trim(), connector });
    } else if (fieldMap.size > 0) {
      // Fallback: try to preserve raw
      rows.push({ field: "", operator: ":=", value: part, connector });
    }
  }
  return rows;
}

export function filterRowsToString(rows: FilterRow[]): string {
  return rows
    .map((r, i) => {
      const val = r.operator === ":[" ? `[${r.value}]` : ` ${r.value}`;
      const expr = `${r.field}${r.operator}${val}`;
      return i < rows.length - 1 ? `${expr} ${r.connector}` : expr;
    })
    .join(" ");
}

export function parseSortString(str: string): SortRow[] {
  if (!str.trim()) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [field, dir] = s.split(":");
    return { field: field || "", direction: (dir === "asc" ? "asc" : "desc") as "asc" | "desc" };
  });
}

export function sortRowsToString(rows: SortRow[]): string {
  return rows.map((r) => `${r.field}:${r.direction}`).join(",");
}
