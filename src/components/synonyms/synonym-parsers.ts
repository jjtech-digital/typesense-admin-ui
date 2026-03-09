// ── types ─────────────────────────────────────────────────────────────────────

export interface ParsedItem {
  setName: string;
  itemId: string;
  root?: string;
  synonyms: string[];
}

// For uploading: items grouped per set
export interface SetPayload {
  setName: string;
  items: { id: string; synonyms: string[]; root?: string }[];
}

export type UploadStatus = "pending" | "success" | "error";

export interface SetResult {
  setName: string;
  itemCount: number;
  status: UploadStatus;
  message?: string;
}

// ── CSV parser ─────────────────────────────────────────────────────────────────
// Columns: set_name, item_id, root (optional), synonyms (comma-separated, quoted)

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseCsv(text: string): { rows: ParsedItem[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["File is empty"] };

  const firstLower = lines[0].toLowerCase();
  const hasHeader =
    firstLower.includes("set") ||
    firstLower.includes("item") ||
    firstLower.includes("synonym");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: ParsedItem[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, idx) => {
    const lineNum = idx + (hasHeader ? 2 : 1);
    const cols = parseCsvLine(line);

    if (cols.length < 3) {
      errors.push(`Line ${lineNum}: needs at least 3 columns (set_name, item_id, synonyms)`);
      return;
    }

    // 3 cols: set_name, item_id, synonyms
    // 4 cols: set_name, item_id, root, synonyms
    let setName: string, itemId: string, root: string | undefined, rawSynonyms: string;
    if (cols.length === 3) {
      [setName, itemId, rawSynonyms] = cols;
    } else {
      [setName, itemId, root, rawSynonyms] = cols;
      if (!root) root = undefined;
    }

    if (!setName) { errors.push(`Line ${lineNum}: set_name is required`); return; }
    if (!itemId) { errors.push(`Line ${lineNum}: item_id is required`); return; }

    const synonyms = rawSynonyms.split(",").map((s) => s.trim()).filter(Boolean);
    if (synonyms.length === 0) { errors.push(`Line ${lineNum}: synonyms list is empty`); return; }

    rows.push({ setName, itemId, root: root || undefined, synonyms });
  });

  return { rows, errors };
}

// ── JSON parser ───────────────────────────────────────────────────────────────
// Expected: array of { set_name, item_id, root?, synonyms[] }
// OR: array of { name, items: [{id, root?, synonyms[]}] }

export function parseJson(text: string): { rows: ParsedItem[]; errors: string[] } {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { rows: [], errors: ["JSON must be an array"] };
    }

    const rows: ParsedItem[] = [];
    const errors: string[] = [];

    // Detect format from first element
    const first = parsed[0];
    const isSetFormat = first && ("name" in first || "items" in first);

    if (isSetFormat) {
      // Format: [{name, items: [{id, root?, synonyms[]}]}]
      parsed.forEach((set, si) => {
        if (!set.name) { errors.push(`Set ${si + 1}: "name" is required`); return; }
        if (!Array.isArray(set.items)) { errors.push(`Set ${si + 1}: "items" must be an array`); return; }
        set.items.forEach((item: Record<string, unknown>, ii: number) => {
          if (!item.id) { errors.push(`Set ${si + 1} item ${ii + 1}: "id" is required`); return; }
          if (!Array.isArray(item.synonyms) || (item.synonyms as string[]).length === 0) {
            errors.push(`Set ${si + 1} item ${ii + 1}: "synonyms" must be a non-empty array`);
            return;
          }
          rows.push({
            setName: set.name,
            itemId: item.id as string,
            root: item.root as string | undefined,
            synonyms: item.synonyms as string[],
          });
        });
      });
    } else {
      // Flat format: [{set_name, item_id, root?, synonyms[]}]
      parsed.forEach((item, idx) => {
        if (!item.set_name) { errors.push(`Item ${idx + 1}: "set_name" is required`); return; }
        if (!item.item_id) { errors.push(`Item ${idx + 1}: "item_id" is required`); return; }
        if (!Array.isArray(item.synonyms) || item.synonyms.length === 0) {
          errors.push(`Item ${idx + 1}: "synonyms" must be a non-empty array`);
          return;
        }
        rows.push({
          setName: item.set_name,
          itemId: item.item_id,
          root: item.root || undefined,
          synonyms: item.synonyms,
        });
      });
    }

    return { rows, errors };
  } catch (e) {
    return {
      rows: [],
      errors: [e instanceof Error ? `JSON parse error: ${e.message}` : "Invalid JSON"],
    };
  }
}

// Group parsed items → one payload per synonym set
export function groupIntoSets(rows: ParsedItem[]): SetPayload[] {
  const map = new Map<string, SetPayload>();
  for (const row of rows) {
    if (!map.has(row.setName)) map.set(row.setName, { setName: row.setName, items: [] });
    map.get(row.setName)!.items.push({
      id: row.itemId,
      synonyms: row.synonyms,
      ...(row.root ? { root: row.root } : {}),
    });
  }
  return Array.from(map.values());
}

// ── template download ─────────────────────────────────────────────────────────

export function downloadCsvTemplate() {
  const content = [
    "set_name,item_id,root,synonyms",
    'clothing-synonyms,syn-shirt,,"shirt,tee,top"',
    'clothing-synonyms,syn-blazer,blazer,"coat,jacket"',
    'vehicle-synonyms,syn-car,,"car,automobile,vehicle"',
  ].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "synonym-sets-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
