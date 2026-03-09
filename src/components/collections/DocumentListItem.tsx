"use client";

import React, { useState } from "react";
import {
  ChevronDown, ChevronUp, X, Pencil, Trash2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { findFirstImage, SHOWN_FIELDS } from "@/components/collections/document-utils";
import { formatValue } from "@/components/collections/formatValue";

export function DocumentListItem({
  doc, index, collectionName, onDeleted, onUpdated,
}: {
  doc: Record<string, unknown>;
  index: number;
  collectionName: string;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, updated: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { getConfig, getBaseUrl } = useConnectionConfig();

  const imageUrl = findFirstImage(doc);
  const entries = Object.entries(doc);
  const shown = expanded ? entries : entries.slice(0, SHOWN_FIELDS);
  const hiddenCount = entries.length - SHOWN_FIELDS;
  const docId = String(doc.id ?? "");

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const cfg = getConfig();
    const baseUrl = getBaseUrl();
    if (!cfg || !baseUrl) return;
    setDeleting(true);
    try {
      const res = await fetch(`${baseUrl}/collections/${collectionName}/documents/${docId}`, {
        method: "DELETE",
        headers: { "X-TYPESENSE-API-KEY": cfg.apiKey },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      onDeleted(docId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const openEdit = () => {
    setEditJson(JSON.stringify(doc, null, 2));
    setEditError(null);
    setShowEdit(true);
  };

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editJson);
    } catch {
      setEditError("Invalid JSON — please fix syntax errors before saving.");
      return;
    }
    const cfg = getConfig();
    const baseUrl = getBaseUrl();
    if (!cfg || !baseUrl) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`${baseUrl}/collections/${collectionName}/documents/${docId}`, {
        method: "PATCH",
        headers: { "X-TYPESENSE-API-KEY": cfg.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      onUpdated(docId, data);
      setShowEdit(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
        <div className="flex gap-3 p-4">
          {/* Index */}
          <div className="flex-shrink-0 w-6 pt-0.5 text-right">
            <span className="text-xs font-mono text-gray-400">{index}</span>
          </div>

          {/* Key-value fields — Algolia style: keys right-aligned */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <table className="w-full">
              <tbody>
                {shown.map(([key, value]) => (
                  <tr key={key} className="align-top group">
                    <td className="text-right font-semibold text-gray-600 pr-3 sm:pr-4 whitespace-nowrap py-0.5 text-xs w-28 sm:w-48 flex-shrink-0">
                      {key}
                    </td>
                    <td className="py-0.5 min-w-0 max-w-0 w-full">
                      <div className="break-words">{formatValue(value)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Image thumbnail — top right */}
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 self-start"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt="preview"
                className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:border-brand transition-colors shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </a>
          )}
        </div>

        {/* Footer: show more + action buttons */}
        <div className="flex items-center justify-between px-4 pb-3 border-t border-gray-50 pt-2">
          {hiddenCount > 0 ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-brand hover:underline flex items-center gap-1"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> Show less</>
                : <><ChevronDown className="h-3 w-3" /> Show more attributes ({hiddenCount})</>
              }
            </button>
          ) : <span />}

          <div className="flex items-center gap-1">
            <button
              onClick={openEdit}
              title="Edit document JSON"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title={confirmDelete ? "Click again to confirm delete" : "Delete document"}
              className={`p-1.5 rounded-lg transition-colors ${confirmDelete ? "text-red-600 bg-red-50 ring-1 ring-red-200" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Document</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">id: {docId}</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
              <textarea
                value={editJson}
                onChange={(e) => { setEditJson(e.target.value); setEditError(null); }}
                className="w-full h-96 font-mono text-xs border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand bg-gray-50"
                spellCheck={false}
              />
              {editError && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {editError}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" />
                Update Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
