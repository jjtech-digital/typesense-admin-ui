"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Database, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CollectionList } from "@/components/collections/CollectionList";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal";
import type { TypesenseCollection } from "@/types/typesense";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<TypesenseCollection[]>([]);
  const [filtered, setFiltered] = useState<TypesenseCollection[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { getHeaders } = useConnectionConfig();
  const { error } = useToast();

  const fetchCollections = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/collections", { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cols = Array.isArray(data) ? data : [];
      setCollections(cols);
      setFiltered(cols);
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Failed to fetch collections"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getHeaders, error]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (!search) {
      setFiltered(collections);
    } else {
      setFiltered(
        collections.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, collections]);

  return (
    <div>
      <Header onRefresh={fetchCollections} isRefreshing={refreshing} />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections..."
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        </div>

        {/* Summary */}
        {!loading && (
          <p className="text-sm text-gray-500">
            {filtered.length === collections.length
              ? `${collections.length} collection${collections.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${collections.length} collections`}
          </p>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-gray-100 rounded-lg" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-5 bg-gray-100 rounded w-20" />
                  <div className="h-5 bg-gray-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CollectionList collections={filtered} />
        )}
      </div>

      <CreateCollectionModal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          fetchCollections();
        }}
      />
    </div>
  );
}
