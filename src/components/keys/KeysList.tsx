"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, EyeOff, Key, Copy, Check } from "lucide-react";
import type { TypesenseApiKey } from "@/types/typesense";
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
import { maskApiKey, formatDate } from "@/lib/utils";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { CreateKeyModal } from "./CreateKeyModal";

interface KeysListProps {
  initialKeys?: TypesenseApiKey[];
}

export function KeysList({ initialKeys }: KeysListProps) {
  const [keys, setKeys] = useState<TypesenseApiKey[]>(initialKeys || []);
  const [loading, setLoading] = useState(!initialKeys);
  const [deleteTarget, setDeleteTarget] = useState<TypesenseApiKey | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys", { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys || []);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, error]);

  useEffect(() => {
    if (!initialKeys) {
      fetchKeys();
    }
  }, [fetchKeys, initialKeys]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/keys/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      success("API key deleted successfully");
      setDeleteTarget(null);
      fetchKeys();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete API key");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleReveal = (id: number) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyValue = async (id: number, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSuccess = (keyValue: string) => {
    setNewKeyValue(keyValue);
    fetchKeys();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500">
            {keys.length} key{keys.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Key className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* New key display banner */}
      {newKeyValue && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Key className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">
                New API Key Created
              </p>
              <p className="text-xs text-green-700 mb-2">
                Copy this key now — it won&apos;t be shown again!
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 px-3 py-2">
                <code className="flex-1 text-sm font-mono text-gray-800 break-all">
                  {newKeyValue}
                </code>
                <button
                  onClick={() => copyValue(-1, newKeyValue)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                >
                  {copiedId === -1 ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKeyValue(null)}
              className="text-green-400 hover:text-green-600 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="w-16">ID</TableHeader>
            <TableHeader>Description</TableHeader>
            <TableHeader>Key Value</TableHeader>
            <TableHeader>Actions</TableHeader>
            <TableHeader>Collections</TableHeader>
            <TableHeader>Expires</TableHeader>
            <TableHeader className="w-24">Delete</TableHeader>
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
          ) : keys.length > 0 ? (
            keys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell>
                  <span className="font-mono text-sm text-gray-500">
                    {apiKey.id}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-900">
                    {apiKey.description}
                  </span>
                </TableCell>
                <TableCell>
                  {apiKey.value ? (
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {apiKey.id !== undefined && revealedKeys.has(apiKey.id)
                          ? apiKey.value
                          : maskApiKey(apiKey.value)}
                      </code>
                      <div className="flex gap-1">
                        <button
                          onClick={() => apiKey.id !== undefined && toggleReveal(apiKey.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={
                            apiKey.id !== undefined && revealedKeys.has(apiKey.id)
                              ? "Hide"
                              : "Reveal"
                          }
                        >
                          {apiKey.id !== undefined && revealedKeys.has(apiKey.id) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            apiKey.id !== undefined &&
                            apiKey.value &&
                            copyValue(apiKey.id, apiKey.value)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy"
                        >
                          {apiKey.id !== undefined && copiedId === apiKey.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Hidden</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.actions.map((action) => (
                      <Badge key={action} variant="info" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.collections.map((col) => (
                      <Badge key={col} variant="default" className="text-xs font-mono">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {apiKey.expires_at && apiKey.expires_at !== 64723363199 ? (
                    <span className="text-sm text-gray-600">
                      {formatDate(apiKey.expires_at)}
                    </span>
                  ) : (
                    <Badge variant="success">Never</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setDeleteTarget(apiKey)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableEmpty
              colSpan={7}
              message="No API keys yet"
              icon={<Key className="h-10 w-10" />}
            />
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete API Key"
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
              Delete Key
            </Button>
          </div>
        }
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the API key{" "}
            <strong>&ldquo;{deleteTarget?.description}&rdquo;</strong>? Any
            applications using this key will stop working.
          </p>
        </div>
      </Modal>

      {/* Create modal */}
      <CreateKeyModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
