"use client";

import React, { useState } from "react";
import { Database } from "lucide-react";
import type { TypesenseCollection } from "@/types/typesense";
import { CollectionCard } from "./CollectionCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface CollectionListProps {
  collections: TypesenseCollection[];
}

export function CollectionList({ collections }: CollectionListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { success, error } = useToast();
  const router = useRouter();
  const { getHeaders } = useConnectionConfig();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/collections/${deleteTarget}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete collection");
      }

      success(`Collection "${deleteTarget}" deleted successfully`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  };

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Database className="h-16 w-16 mb-4 opacity-30" />
        <h3 className="text-lg font-medium text-gray-500">No collections yet</h3>
        <p className="text-sm mt-1">
          Create your first collection to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.name}
            collection={collection}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Collection"
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
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={isDeleting}
            >
              Delete Collection
            </Button>
          </div>
        }
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-700 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              &ldquo;{deleteTarget}&rdquo;
            </span>
            ?
          </p>
          <p className="text-red-600 text-xs mt-2 font-medium">
            This will permanently delete all documents in this collection. This
            action cannot be undone.
          </p>
        </div>
      </Modal>
    </>
  );
}
