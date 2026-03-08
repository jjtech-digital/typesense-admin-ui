"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Edit2, GitMerge, ArrowRight, Upload } from "lucide-react";
import type { TypesenseSynonym } from "@/types/typesense";
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

interface SynonymsListProps {
  collectionName: string;
}

export function SynonymsList({ collectionName }: SynonymsListProps) {
  const [synonyms, setSynonyms] = useState<TypesenseSynonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TypesenseSynonym | null>(null);
  const [editTarget, setEditTarget] = useState<TypesenseSynonym | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  const fetchSynonyms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionName}/synonyms`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSynonyms(data.synonyms || []);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch synonyms");
    } finally {
      setLoading(false);
    }
  }, [collectionName, getHeaders, error]);

  useEffect(() => {
    fetchSynonyms();
  }, [fetchSynonyms]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionName}/synonyms/${deleteTarget.id}`,
        { method: "DELETE", headers: getHeaders() }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      success("Synonym deleted successfully");
      setDeleteTarget(null);
      fetchSynonyms();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete synonym");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOneWay = (s: TypesenseSynonym) => !!s.root;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Synonyms</h2>
          <p className="text-sm text-gray-500">
            {synonyms.length} synonym{synonyms.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Add Synonym
          </Button>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Root Word</TableHeader>
            <TableHeader>Synonyms</TableHeader>
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
          ) : synonyms.length > 0 ? (
            synonyms.map((synonym) => (
              <TableRow key={synonym.id}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    {synonym.id}
                  </span>
                </TableCell>
                <TableCell>
                  {isOneWay(synonym) ? (
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
                  {synonym.root ? (
                    <span className="font-medium text-gray-900 bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-sm">
                      {synonym.root}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {synonym.synonyms.map((s, i) => (
                      <Badge key={i} variant="default">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditTarget(synonym)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(synonym)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableEmpty
              colSpan={5}
              message="No synonyms defined yet"
              icon={<GitMerge className="h-10 w-10" />}
            />
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Synonym"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete synonym{" "}
          <strong>&ldquo;{deleteTarget?.id}&rdquo;</strong>? This action cannot
          be undone.
        </p>
      </Modal>

      {/* Create/Edit modal */}
      <CreateSynonymModal
        isOpen={createOpen || !!editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
        collectionName={collectionName}
        editSynonym={editTarget}
        onSuccess={fetchSynonyms}
      />

      {/* Bulk upload modal */}
      <BulkUploadSynonymsModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        collectionName={collectionName}
        onSuccess={fetchSynonyms}
      />
    </div>
  );
}
