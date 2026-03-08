"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  Code2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  GitMerge,
  Download,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

// ── types ──────────────────────────────────────────────────────────────────

interface ParsedSynonym {
  id: string;
  root?: string;
  synonyms: string[];
}

type UploadStatus = "pending" | "success" | "error";

interface RowResult extends ParsedSynonym {
  status: UploadStatus;
  message?: string;
}

type Tab = "csv" | "json";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  onSuccess: () => void;
}

// ── CSV parser ─────────────────────────────────────────────────────────────
// Expected columns: id, root, synonyms
// "synonyms" cell is itself comma-separated values (quoted if they contain commas)

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function parseCsv(text: string): { rows: ParsedSynonym[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { rows: [], errors: ["File is empty"] };

  // Detect header
  const firstLineLower = lines[0].toLowerCase();
  const hasHeader =
    firstLineLower.includes("id") ||
    firstLineLower.includes("root") ||
    firstLineLower.includes("synonym");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: ParsedSynonym[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, idx) => {
    const lineNum = idx + (hasHeader ? 2 : 1);
    const cols = parseCsvLine(line);

    if (cols.length < 2) {
      errors.push(`Line ${lineNum}: needs at least 2 columns (id, synonyms)`);
      return;
    }

    // Support 2-column (id, synonyms) or 3-column (id, root, synonyms)
    let id: string, root: string | undefined, rawSynonyms: string;
    if (cols.length === 2) {
      [id, rawSynonyms] = cols;
      root = undefined;
    } else {
      [id, root, rawSynonyms] = cols;
      if (!root) root = undefined;
    }

    if (!id) {
      errors.push(`Line ${lineNum}: id is required`);
      return;
    }

    const synonyms = rawSynonyms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (synonyms.length === 0) {
      errors.push(`Line ${lineNum}: synonyms list is empty`);
      return;
    }

    rows.push({ id, root: root || undefined, synonyms });
  });

  return { rows, errors };
}

// ── JSON parser ────────────────────────────────────────────────────────────

function parseJson(text: string): { rows: ParsedSynonym[]; errors: string[] } {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { rows: [], errors: ["JSON must be an array of synonym objects"] };
    }

    const rows: ParsedSynonym[] = [];
    const errors: string[] = [];

    parsed.forEach((item, idx) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`Item ${idx + 1}: must be an object`);
        return;
      }
      if (!item.id || typeof item.id !== "string") {
        errors.push(`Item ${idx + 1}: "id" (string) is required`);
        return;
      }
      if (!Array.isArray(item.synonyms) || item.synonyms.length === 0) {
        errors.push(`Item ${idx + 1}: "synonyms" must be a non-empty array`);
        return;
      }
      rows.push({
        id: item.id,
        root: item.root || undefined,
        synonyms: item.synonyms,
      });
    });

    return { rows, errors };
  } catch (e) {
    return {
      rows: [],
      errors: [e instanceof Error ? `JSON parse error: ${e.message}` : "Invalid JSON"],
    };
  }
}

// ── CSV template download ──────────────────────────────────────────────────

function downloadCsvTemplate() {
  const content = [
    "id,root,synonyms",
    'syn-car,,"car,automobile,vehicle"',
    'syn-phone,smartphone,"mobile,cell phone,handset"',
  ].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "synonyms-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── component ──────────────────────────────────────────────────────────────

export function BulkUploadSynonymsModal({
  isOpen,
  onClose,
  collectionName,
  onSuccess,
}: Props) {
  const [tab, setTab] = useState<Tab>("csv");
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ParsedSynonym[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const { getHeaders } = useConnectionConfig();

  const reset = () => {
    setCsvText("");
    setJsonText("");
    setParseErrors([]);
    setPreview([]);
    setResults([]);
    setUploadDone(false);
    setProgress(0);
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      onClose();
    }
  };

  // Parse whichever tab is active
  const parse = useCallback(
    (text: string, source: Tab) => {
      const { rows, errors } =
        source === "csv" ? parseCsv(text) : parseJson(text);
      setParseErrors(errors);
      setPreview(rows);
      setResults([]);
      setUploadDone(false);
    },
    []
  );

  // CSV file drop / select
  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseErrors(["Please upload a .csv file"]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      parse(text, "csv");
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Upload all parsed rows sequentially
  const handleUpload = async () => {
    if (preview.length === 0) return;
    setUploading(true);
    setProgress(0);

    const rowResults: RowResult[] = preview.map((r) => ({
      ...r,
      status: "pending",
    }));
    setResults([...rowResults]);

    let successCount = 0;

    for (let i = 0; i < preview.length; i++) {
      const row = preview[i];
      try {
        const res = await fetch(
          `/api/collections/${collectionName}/synonyms`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getHeaders() },
            body: JSON.stringify({
              id: row.id,
              synonyms: row.synonyms,
              ...(row.root ? { root: row.root } : {}),
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          const detail = data.url ? ` [${data.url}]` : "";
          throw new Error((data.error || "Failed") + detail);
        }
        rowResults[i] = { ...row, status: "success" };
        successCount++;
      } catch (e) {
        rowResults[i] = {
          ...row,
          status: "error",
          message: e instanceof Error ? e.message : "Unknown error",
        };
      }
      setResults([...rowResults]);
      setProgress(i + 1);
    }

    setUploading(false);
    setUploadDone(true);

    if (successCount > 0) {
      success(
        `${successCount} of ${preview.length} synonym${preview.length !== 1 ? "s" : ""} uploaded`
      );
      onSuccess();
    } else {
      toastError("All uploads failed — check the errors below");
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Synonyms"
      size="xl"
      footer={
        uploadDone ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {successCount} succeeded · {errorCount} failed
            </span>
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {preview.length > 0 &&
                `${preview.length} synonym${preview.length !== 1 ? "s" : ""} ready to upload`}
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={preview.length === 0 || uploading}
                loading={uploading}
              >
                {uploading
                  ? `Uploading ${progress}/${preview.length}…`
                  : `Upload ${preview.length > 0 ? preview.length : ""} Synonym${preview.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => { setTab("csv"); reset(); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "csv"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            CSV File
          </button>
          <button
            onClick={() => { setTab("json"); reset(); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "json"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Code2 className="h-4 w-4" />
            JSON
          </button>
        </div>

        {/* ── CSV tab ── */}
        {tab === "csv" && (
          <div className="space-y-4">
            {/* Format hint + template download */}
            <div className="flex items-start justify-between gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Expected CSV format (3 columns):</p>
                <p className="font-mono bg-blue-100 rounded px-2 py-1">
                  id, root, synonyms
                </p>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-blue-700">
                  <li>Leave <span className="font-mono">root</span> empty for multi-way synonyms</li>
                  <li>Separate synonym words with commas inside quotes</li>
                  <li>First row can be a header (auto-detected)</li>
                </ul>
              </div>
              <button
                onClick={downloadCsvTemplate}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 border border-blue-300 hover:border-blue-500 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                dragging
                  ? "border-brand bg-brand/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <Upload className={`h-8 w-8 ${dragging ? "text-brand" : "text-gray-300"}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {csvText ? "Replace file" : "Drop CSV file here"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
              </div>
              {csvText && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  File loaded · {csvText.split("\n").filter(Boolean).length} lines
                </span>
              )}
            </div>

            {/* Paste area */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Or paste CSV directly
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parse(e.target.value, "csv");
                }}
                placeholder={`id,root,synonyms\nsyn-car,,"car,automobile,vehicle"\nsyn-phone,smartphone,"mobile,cell phone"`}
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>
          </div>
        )}

        {/* ── JSON tab ── */}
        {tab === "json" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Expected JSON format:</p>
              <pre className="bg-blue-100 rounded px-3 py-2 text-blue-900 overflow-x-auto">{`[
  { "id": "syn-car", "synonyms": ["car", "automobile"] },
  { "id": "syn-phone", "root": "smartphone", "synonyms": ["mobile", "cell phone"] }
]`}</pre>
              <p className="text-blue-700">Omit <span className="font-mono">root</span> for multi-way synonyms.</p>
            </div>

            <textarea
              rows={10}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                parse(e.target.value, "json");
              }}
              placeholder={`[\n  { "id": "syn-1", "synonyms": ["car", "automobile"] }\n]`}
              className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>
        )}

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
            <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Parse errors ({parseErrors.length})
            </p>
            <ul className="space-y-0.5">
              {parseErrors.map((e, i) => (
                <li key={i} className="text-xs text-red-600 font-mono">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview / results table */}
        {preview.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {uploadDone ? "Upload results" : "Preview"} — {preview.length} synonym{preview.length !== 1 ? "s" : ""}
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">ID</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Synonyms</th>
                      {uploadDone && (
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, i) => {
                      const result = results[i];
                      return (
                        <tr
                          key={i}
                          className={
                            result?.status === "success"
                              ? "bg-green-50"
                              : result?.status === "error"
                              ? "bg-red-50"
                              : ""
                          }
                        >
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">
                            {row.id}
                          </td>
                          <td className="px-3 py-2">
                            {row.root ? (
                              <span className="inline-flex items-center gap-1 text-blue-700">
                                <ArrowRight className="h-3 w-3" />
                                One-way
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <GitMerge className="h-3 w-3" />
                                Multi
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.root && (
                                <Badge variant="info" className="text-xs">
                                  root: {row.root}
                                </Badge>
                              )}
                              {row.synonyms.map((s, j) => (
                                <Badge key={j} variant="default" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          {uploadDone && (
                            <td className="px-3 py-2">
                              {result?.status === "pending" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                              )}
                              {result?.status === "success" && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              )}
                              {result?.status === "error" && (
                                <span
                                  className="flex items-center gap-1 text-red-600"
                                  title={result.message}
                                >
                                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate max-w-[120px]">
                                    {result.message}
                                  </span>
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upload progress bar */}
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-300 rounded-full"
                    style={{ width: `${(progress / preview.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {progress} / {preview.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
