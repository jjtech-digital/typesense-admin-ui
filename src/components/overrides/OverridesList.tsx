"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trash2, Edit2, Filter, Plus, Minus } from "lucide-react";
import type { TypesenseOverride } from "@/types/typesense";
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

interface OverridesListProps {
  collectionName: string;
}

export function OverridesList({ collectionName }: OverridesListProps) {
  const [overrides, setOverrides] = useState<TypesenseOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TypesenseOverride | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionName}/overrides`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOverrides(data.overrides || []);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch overrides");
    } finally {
      setLoading(false);
    }
  }, [collectionName, getHeaders, error]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionName}/overrides/${deleteTarget.id}`,
        { method: "DELETE", headers: getHeaders() }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      success("Curation rule deleted successfully");
      setDeleteTarget(null);
      fetchOverrides();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete curation rule");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Curation Rules
          </h2>
          <p className="text-sm text-gray-500">
            {overrides.length} rule{overrides.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <Link href={`/collections/${collectionName}/rules/new`}>
          <Button variant="primary" className="self-start sm:self-auto">
            Add Rule
          </Button>
        </Link>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Query</TableHeader>
            <TableHeader>Match</TableHeader>
            <TableHeader>Includes</TableHeader>
            <TableHeader>Excludes</TableHeader>
            <TableHeader>Filter</TableHeader>
            <TableHeader className="w-24">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))
          ) : overrides.length > 0 ? (
            overrides.map((override) => (
              <TableRow key={override.id}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    {override.id}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900">
                    &ldquo;{override.rule.query}&rdquo;
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      override.rule.match === "exact" ? "info" : "warning"
                    }
                  >
                    {override.rule.match}
                  </Badge>
                </TableCell>
                <TableCell>
                  {override.includes && override.includes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {override.includes.map((inc) => (
                        <Badge
                          key={inc.id}
                          variant="success"
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          {inc.id} @{inc.position}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {override.excludes && override.excludes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {override.excludes.map((exc) => (
                        <Badge
                          key={exc.id}
                          variant="danger"
                          className="flex items-center gap-1"
                        >
                          <Minus className="h-2.5 w-2.5" />
                          {exc.id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {override.filter_by ? (
                    <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {override.filter_by}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/collections/${collectionName}/rules/${override.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(override)}
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
              colSpan={7}
              message="No curation rules defined yet"
              icon={<Filter className="h-10 w-10" />}
            />
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Curation Rule"
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
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete curation rule{" "}
          <strong>&ldquo;{deleteTarget?.id}&rdquo;</strong>? This action cannot
          be undone.
        </p>
      </Modal>

    </div>
  );
}
