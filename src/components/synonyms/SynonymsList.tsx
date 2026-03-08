"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  Edit2,
  GitMerge,
  ArrowRight,
  Upload,
  ChevronDown,
  ChevronRight,
  Package,
} from "lucide-react";
import type { SynonymSet, SynonymItem } from "@/types/typesense";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { CreateSynonymModal } from "./CreateSynonymModal";
import { BulkUploadSynonymsModal } from "./BulkUploadSynonymsModal";

export function SynonymsList() {
  const [sets, setSets] = useState<SynonymSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<SynonymSet | null>(null);
  const [editTarget, setEditTarget] = useState<SynonymSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { success, error } = useToast();
  const { getConfig, getBaseUrl } = useConnectionConfig();

  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = getConfig();
      const baseUrl = getBaseUrl();
      if (!cfg || !baseUrl) throw new Error("No Typesense connection configured.");

      const res = await fetch(`${baseUrl}/synonym_sets`, {
        headers: { "X-TYPESENSE-API-KEY": cfg.apiKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch synonym sets");
      setSets(Array.isArray(data) ? data : data.synonym_sets || []);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch synonym sets");
    } finally {
      setLoading(false);
    }
  }, [getConfig, getBaseUrl, error]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const handleDeleteSet = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const cfg = getConfig();
      const baseUrl = getBaseUrl();
      if (!cfg || !baseUrl) throw new Error("No Typesense connection configured.");

      const res = await fetch(
        `${baseUrl}/synonym_sets/${encodeURIComponent(deleteTarget.name)}`,
        {
          method: "DELETE",
          headers: { "X-TYPESENSE-API-KEY": cfg.apiKey },
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete synonym set");
      }
      success(`Synonym set "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchSets();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete synonym set");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (name: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const totalItems = sets.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Synonym Sets</h2>
          <p className="text-sm text-gray-500">
            {sets.length} set{sets.length !== 1 ? "s" : ""} · {totalItems} item
            {totalItems !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <span className="hidden sm:inline">New Synonym Set</span>
            <span className="sm:hidden">New Set</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="w-8" />
            <TableHeader>Set Name</TableHeader>
            <TableHeader className="w-24">Items</TableHeader>
            <TableHeader>Preview</TableHeader>
            <TableHeader className="w-24">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))
          ) : sets.length > 0 ? (
            sets.flatMap((set) => {
              const expanded = expandedSets.has(set.name);
              const items = set.items ?? [];
              return [
                /* Set row */
                <TableRow
                  key={set.name}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(set.name)}
                >
                  <TableCell>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm font-medium text-gray-800">
                      {set.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{items.length} item{items.length !== 1 ? "s" : ""}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 text-xs text-gray-500"
                        >
                          {item.root ? (
                            <>
                              <ArrowRight className="h-3 w-3 text-blue-400" />
                              <span className="text-blue-700 font-medium">{item.root}</span>
                            </>
                          ) : (
                            <GitMerge className="h-3 w-3 text-green-500" />
                          )}
                          {item.synonyms.slice(0, 2).join(", ")}
                          {item.synonyms.length > 2 && "…"}
                        </span>
                      ))}
                      {items.length > 3 && (
                        <span className="text-xs text-gray-400">+{items.length - 3} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditTarget(set)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit set"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(set)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete set"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>,

                /* Expanded items */
                ...(expanded
                  ? items.map((item: SynonymItem) => (
                      <TableRow key={`${set.name}::${item.id}`} className="bg-gray-50/50">
                        <TableCell />
                        <TableCell>
                          <span className="pl-4 font-mono text-xs text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded">
                            {item.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.root ? (
                            <Badge variant="info" className="flex items-center gap-1 w-fit">
                              <ArrowRight className="h-3 w-3" />
                              One-way
                            </Badge>
                          ) : (
                            <Badge variant="success" className="flex items-center gap-1 w-fit">
                              <GitMerge className="h-3 w-3" />
                              Multi-way
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.root && (
                              <span className="font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs">
                                {item.root} →
                              </span>
                            )}
                            {item.synonyms.map((s, i) => (
                              <Badge key={i} variant="default">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ))
                  : []),
              ];
            })
          ) : (
            <TableEmpty
              colSpan={5}
              message="No synonym sets defined yet"
              icon={<Package className="h-10 w-10" />}
            />
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Synonym Set"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSet} loading={isDeleting}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete synonym set{" "}
          <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> and all its{" "}
          {deleteTarget?.items?.length ?? 0} item
          {(deleteTarget?.items?.length ?? 0) !== 1 ? "s" : ""}? This action cannot be undone.
        </p>
      </Modal>

      {/* Create / Edit modal */}
      <CreateSynonymModal
        isOpen={createOpen || !!editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
        editSet={editTarget}
        onSuccess={fetchSets}
      />

      {/* Bulk upload modal */}
      <BulkUploadSynonymsModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchSets}
      />
    </div>
  );
}
