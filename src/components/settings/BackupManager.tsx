"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Download,
  FileJson,
  FileText,
  CheckCircle,
  Loader2,
  Archive,
  ArrowDownToLine,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TypesenseCollection } from "@/types/typesense";

type ExportStatus = "idle" | "exporting" | "done" | "error";

interface CollectionExportState {
  status: ExportStatus;
  error?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function BackupManager() {
  const { getHeaders } = useConnectionConfig();
  const { success, error: showError } = useToast();

  const [collections, setCollections] = useState<TypesenseCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportStates, setExportStates] = useState<Record<string, CollectionExportState>>({});
  const [fullBackupRunning, setFullBackupRunning] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections", { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch {
      showError("Could not load collections");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, showError]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === collections.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(collections.map((c) => c.name)));
    }
  };

  // Export a single collection's schema
  const exportSchema = async (name: string) => {
    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(name)}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch schema");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `${name}-schema-${timestamp()}.json`);
      success(`Schema exported: ${name}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  // Export a single collection's documents as JSONL
  const exportDocuments = async (name: string) => {
    setExportStates((prev) => ({ ...prev, [name]: { status: "exporting" } }));
    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(name)}/export`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(data.error || "Export failed");
      }
      const text = await res.text();
      const blob = new Blob([text], { type: "application/x-jsonlines" });
      downloadBlob(blob, `${name}-documents-${timestamp()}.jsonl`);
      setExportStates((prev) => ({ ...prev, [name]: { status: "done" } }));
      success(`Documents exported: ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setExportStates((prev) => ({ ...prev, [name]: { status: "error", error: msg } }));
      showError(msg);
    }
  };

  // Export synonyms for a collection
  const exportSynonyms = async (name: string) => {
    try {
      const res = await fetch(
        `/api/collections/${encodeURIComponent(name)}/synonyms`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("Failed to fetch synonyms");
      const data = await res.json();
      const synonyms = data.synonyms || [];
      if (synonyms.length === 0) {
        showError(`No synonyms found for ${name}`);
        return;
      }
      const blob = new Blob([JSON.stringify(synonyms, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `${name}-synonyms-${timestamp()}.json`);
      success(`Synonyms exported: ${name} (${synonyms.length})`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  // Export overrides/curation rules for a collection
  const exportOverrides = async (name: string) => {
    try {
      const res = await fetch(
        `/api/collections/${encodeURIComponent(name)}/overrides`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("Failed to fetch overrides");
      const data = await res.json();
      const overrides = data.overrides || [];
      if (overrides.length === 0) {
        showError(`No curation rules found for ${name}`);
        return;
      }
      const blob = new Blob([JSON.stringify(overrides, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `${name}-overrides-${timestamp()}.json`);
      success(`Curation rules exported: ${name} (${overrides.length})`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  // Full backup: schemas + documents + synonyms + overrides for selected collections
  const handleFullBackup = async () => {
    const targets = selected.size > 0 ? [...selected] : collections.map((c) => c.name);
    if (targets.length === 0) {
      showError("No collections to back up");
      return;
    }

    setFullBackupRunning(true);
    const backup: Record<string, {
      schema: unknown;
      documents: string;
      synonyms: unknown[];
      overrides: unknown[];
    }> = {};

    const headers = getHeaders();

    for (const name of targets) {
      setExportStates((prev) => ({ ...prev, [name]: { status: "exporting" } }));

      try {
        // Fetch all 4 in parallel per collection
        const [schemaRes, docsRes, synRes, overRes] = await Promise.allSettled([
          fetch(`/api/collections/${encodeURIComponent(name)}`, { headers }),
          fetch(`/api/collections/${encodeURIComponent(name)}/export`, { headers }),
          fetch(`/api/collections/${encodeURIComponent(name)}/synonyms`, { headers }),
          fetch(`/api/collections/${encodeURIComponent(name)}/overrides`, { headers }),
        ]);

        const schema =
          schemaRes.status === "fulfilled" && schemaRes.value.ok
            ? await schemaRes.value.json()
            : null;
        const documents =
          docsRes.status === "fulfilled" && docsRes.value.ok
            ? await docsRes.value.text()
            : "";
        const synonyms =
          synRes.status === "fulfilled" && synRes.value.ok
            ? (await synRes.value.json()).synonyms || []
            : [];
        const overrides =
          overRes.status === "fulfilled" && overRes.value.ok
            ? (await overRes.value.json()).overrides || []
            : [];

        backup[name] = { schema, documents, synonyms, overrides };
        setExportStates((prev) => ({ ...prev, [name]: { status: "done" } }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Export failed";
        setExportStates((prev) => ({ ...prev, [name]: { status: "error", error: msg } }));
      }
    }

    // Build the full backup JSON
    const backupPayload = {
      _meta: {
        exported_at: new Date().toISOString(),
        typesense_admin_ui: "v0.1.0",
        collections_count: Object.keys(backup).length,
      },
      collections: Object.entries(backup).map(([name, data]) => ({
        name,
        schema: data.schema,
        documents_jsonl: data.documents,
        synonyms: data.synonyms,
        overrides: data.overrides,
      })),
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `typesense-backup-${timestamp()}.json`);
    setFullBackupRunning(false);
    success(`Full backup complete (${targets.length} collection${targets.length !== 1 ? "s" : ""})`);
  };

  // Export all schemas only
  const handleExportAllSchemas = async () => {
    const targets = selected.size > 0 ? [...selected] : collections.map((c) => c.name);
    const headers = getHeaders();
    const schemas: unknown[] = [];

    for (const name of targets) {
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(name)}`, { headers });
        if (res.ok) schemas.push(await res.json());
      } catch {
        // skip failed
      }
    }

    const blob = new Blob([JSON.stringify(schemas, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `typesense-schemas-${timestamp()}.json`);
    success(`${schemas.length} schema(s) exported`);
  };

  const allSelected = collections.length > 0 && selected.size === collections.length;
  const someSelected = selected.size > 0 && selected.size < collections.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Archive className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Backup & Download
            </h2>
            <p className="text-sm text-gray-500">
              Export collections, documents, synonyms, and curation rules
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleFullBackup}
            loading={fullBackupRunning}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {selected.size > 0
              ? `Full Backup (${selected.size} selected)`
              : "Full Backup (All)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAllSchemas}
            disabled={collections.length === 0}
          >
            <FileJson className="h-4 w-4" />
            {selected.size > 0
              ? `Export Schemas (${selected.size})`
              : "Export All Schemas"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Full backup includes schemas, documents (JSONL), synonyms, and curation rules.
          {selected.size > 0
            ? ` Operating on ${selected.size} selected collection(s).`
            : " Select specific collections below, or export all."}
        </p>
      </div>

      {/* Collection list */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="px-6 py-10 text-center">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Database className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No collections found</p>
            <p className="text-xs text-gray-400 mt-1">
              Connect to a Typesense server with collections to use backup features
            </p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-gray-50">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {selected.size > 0
                  ? `${selected.size} of ${collections.length} selected`
                  : `${collections.length} collection${collections.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {collections.map((col) => {
              const isSelected = selected.has(col.name);
              const state = exportStates[col.name];

              return (
                <div
                  key={col.name}
                  className={cn(
                    "flex items-center gap-4 px-4 sm:px-6 py-3 transition-colors",
                    isSelected ? "bg-emerald-50/50" : "hover:bg-gray-50"
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(col.name)}
                    className="rounded border-gray-300 text-brand focus:ring-brand flex-shrink-0"
                  />

                  {/* Collection info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {col.name}
                      </span>
                      <Badge variant="default">
                        {formatNumber(col.num_documents)} docs
                      </Badge>
                      <Badge variant="default">
                        {col.fields?.length || 0} fields
                      </Badge>
                      {state?.status === "exporting" && (
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                      )}
                      {state?.status === "done" && (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {state?.status === "error" && (
                        <span className="flex items-center gap-1" title={state.error}>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      )}
                    </div>
                    {col.default_sorting_field && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sort: {col.default_sorting_field}
                      </p>
                    )}
                  </div>

                  {/* Per-collection actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => exportSchema(col.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Export schema"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Schema</span>
                    </button>
                    <button
                      onClick={() => exportDocuments(col.name)}
                      disabled={state?.status === "exporting"}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                      title="Export documents (JSONL)"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Docs</span>
                    </button>
                    <button
                      onClick={() => exportSynonyms(col.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Export synonyms"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Synonyms</span>
                    </button>
                    <button
                      onClick={() => exportOverrides(col.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Export curation rules"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Rules</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <p className="text-xs text-gray-500">
          Documents are exported as JSONL (one JSON object per line). Schemas, synonyms, and
          curation rules export as JSON. Full backup bundles everything into a single file.
        </p>
      </div>
    </div>
  );
}
