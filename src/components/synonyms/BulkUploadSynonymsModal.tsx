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
  ArrowRight,
  GitMerge,
  Download,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import {
  type ParsedItem,
  type SetPayload,
  type SetResult,
  parseCsv,
  parseJson,
  groupIntoSets,
  downloadCsvTemplate,
} from "@/components/synonyms/synonym-parsers";

// ── types ─────────────────────────────────────────────────────────────────────

type Tab = "csv" | "json";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── component ─────────────────────────────────────────────────────────────────

export function BulkUploadSynonymsModal({ isOpen, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("csv");
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ParsedItem[]>([]);
  const [setPayloads, setSetPayloads] = useState<SetPayload[]>([]);
  const [results, setResults] = useState<SetResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();
  const { getConfig, getBaseUrl } = useConnectionConfig();

  const reset = () => {
    setCsvText("");
    setJsonText("");
    setParseErrors([]);
    setPreview([]);
    setSetPayloads([]);
    setResults([]);
    setUploadDone(false);
    setProgress(0);
  };

  const handleClose = () => {
    if (!uploading) { reset(); onClose(); }
  };

  const parse = useCallback((text: string, source: Tab) => {
    const { rows, errors } = source === "csv" ? parseCsv(text) : parseJson(text);
    setParseErrors(errors);
    setPreview(rows);
    setSetPayloads(groupIntoSets(rows));
    setResults([]);
    setUploadDone(false);
  }, []);

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

  // Upload: one PUT per synonym set
  const handleUpload = async () => {
    if (setPayloads.length === 0) return;
    setUploading(true);
    setProgress(0);

    const rowResults: SetResult[] = setPayloads.map((sp) => ({
      setName: sp.setName,
      itemCount: sp.items.length,
      status: "pending",
    }));
    setResults([...rowResults]);

    const baseUrl = getBaseUrl();
    const cfg = getConfig();
    if (!baseUrl || !cfg) {
      toastError("No Typesense connection configured. Go to Settings first.");
      setUploading(false);
      return;
    }

    let successCount = 0;

    for (let i = 0; i < setPayloads.length; i++) {
      const sp = setPayloads[i];
      try {
        const res = await fetch(
          `${baseUrl}/synonym_sets/${encodeURIComponent(sp.setName)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-TYPESENSE-API-KEY": cfg.apiKey,
            },
            body: JSON.stringify({ items: sp.items }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
        rowResults[i] = { ...rowResults[i], status: "success" };
        successCount++;
      } catch (e) {
        rowResults[i] = {
          ...rowResults[i],
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
        `${successCount} of ${setPayloads.length} synonym set${setPayloads.length !== 1 ? "s" : ""} uploaded`
      );
      onSuccess();
    } else {
      toastError("All uploads failed — check the errors below");
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const uniqueSets = setPayloads.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Synonym Sets"
      size="xl"
      footer={
        uploadDone ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {successCount} sets succeeded · {errorCount} failed
            </span>
            <Button variant="primary" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {uniqueSets > 0 &&
                `${preview.length} item${preview.length !== 1 ? "s" : ""} across ${uniqueSets} set${uniqueSets !== 1 ? "s" : ""}`}
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={uniqueSets === 0 || uploading}
                loading={uploading}
              >
                {uploading
                  ? `Uploading ${progress}/${uniqueSets}…`
                  : `Upload ${uniqueSets > 0 ? uniqueSets : ""} Set${uniqueSets !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {(["csv", "json"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "csv" ? <FileText className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* CSV tab */}
        {tab === "csv" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Expected CSV format (4 columns):</p>
                <p className="font-mono bg-blue-100 rounded px-2 py-1">
                  set_name, item_id, root, synonyms
                </p>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-blue-700">
                  <li>Leave <span className="font-mono">root</span> empty for multi-way synonyms</li>
                  <li>Multiple rows with the same <span className="font-mono">set_name</span> are grouped into one set</li>
                  <li>Uploading to an existing set <strong>replaces</strong> all its items</li>
                  <li>Separate synonym words with commas inside quotes</li>
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
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
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
                onChange={(e) => { setCsvText(e.target.value); parse(e.target.value, "csv"); }}
                placeholder={`set_name,item_id,root,synonyms\nclothing-synonyms,syn-shirt,,"shirt,tee,top"\nclothing-synonyms,syn-blazer,blazer,"coat,jacket"`}
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>
          </div>
        )}

        {/* JSON tab */}
        {tab === "json" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-2">
              <p className="font-semibold">Accepted JSON formats:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium text-blue-700 mb-1">Set format (recommended):</p>
                  <pre className="bg-blue-100 rounded px-2 py-1.5 text-blue-900 overflow-x-auto text-xs">{`[
  {
    "name": "clothing",
    "items": [
      {
        "id": "syn-shirt",
        "synonyms": ["shirt","tee"]
      },
      {
        "id": "syn-blazer",
        "root": "blazer",
        "synonyms": ["coat","jacket"]
      }
    ]
  }
]`}</pre>
                </div>
                <div>
                  <p className="font-medium text-blue-700 mb-1">Flat format:</p>
                  <pre className="bg-blue-100 rounded px-2 py-1.5 text-blue-900 overflow-x-auto text-xs">{`[
  {
    "set_name": "clothing",
    "item_id": "syn-shirt",
    "synonyms": ["shirt","tee"]
  },
  {
    "set_name": "clothing",
    "item_id": "syn-blazer",
    "root": "blazer",
    "synonyms": ["coat","jacket"]
  }
]`}</pre>
                </div>
              </div>
            </div>

            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); parse(e.target.value, "json"); }}
              placeholder={`[\n  {\n    "name": "my-set",\n    "items": [\n      { "id": "item-1", "synonyms": ["car", "automobile"] }\n    ]\n  }\n]`}
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
                <li key={i} className="text-xs text-red-600 font-mono">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview: grouped by set */}
        {setPayloads.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {uploadDone ? "Upload results" : "Preview"} —{" "}
              {preview.length} item{preview.length !== 1 ? "s" : ""} in{" "}
              {uniqueSets} set{uniqueSets !== 1 ? "s" : ""}
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Set Name</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Item ID</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Synonyms</th>
                      {uploadDone && (
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {setPayloads.map((sp) => {
                      const result = results.find((r) => r.setName === sp.setName);
                      return sp.items.map((item, ii) => (
                        <tr
                          key={`${sp.setName}::${item.id}`}
                          className={
                            result?.status === "success"
                              ? "bg-green-50"
                              : result?.status === "error"
                              ? "bg-red-50"
                              : ""
                          }
                        >
                          {/* Set name only on first item row */}
                          {ii === 0 ? (
                            <td
                              className="px-3 py-2 font-mono font-medium text-gray-700 align-top"
                              rowSpan={sp.items.length}
                            >
                              {sp.setName}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 font-mono text-gray-500">{item.id}</td>
                          <td className="px-3 py-2">
                            {item.root ? (
                              <span className="inline-flex items-center gap-1 text-blue-700">
                                <ArrowRight className="h-3 w-3" /> One-way
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <GitMerge className="h-3 w-3" /> Multi
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {item.root && (
                                <Badge variant="info" className="text-xs">
                                  root: {item.root}
                                </Badge>
                              )}
                              {item.synonyms.map((s, j) => (
                                <Badge key={j} variant="default" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </td>
                          {uploadDone && ii === 0 ? (
                            <td
                              className="px-3 py-2 align-top"
                              rowSpan={sp.items.length}
                            >
                              {result?.status === "pending" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                              )}
                              {result?.status === "success" && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              )}
                              {result?.status === "error" && (
                                <span className="flex items-center gap-1 text-red-600" title={result.message}>
                                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate max-w-[100px]">{result.message}</span>
                                </span>
                              )}
                            </td>
                          ) : uploadDone && ii !== 0 ? null : null}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-300 rounded-full"
                    style={{ width: `${(progress / uniqueSets) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {progress} / {uniqueSets} sets
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
