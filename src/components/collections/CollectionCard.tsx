"use client";

import React from "react";
import Link from "next/link";
import {
  Database,
  FileText,
  ChevronRight,
  Trash2,
  Grid3X3,
} from "lucide-react";
import type { TypesenseCollection } from "@/types/typesense";
import { formatNumber, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface CollectionCardProps {
  collection: TypesenseCollection;
  onDelete: (name: string) => void;
}

export function CollectionCard({ collection, onDelete }: CollectionCardProps) {
  const facetedFields = collection.fields.filter((f) => f.facet).length;
  const optionalFields = collection.fields.filter((f) => f.optional).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-brand transition-colors">
              {collection.name}
            </h3>
            {collection.created_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Created {formatDate(collection.created_at)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(collection.name);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Delete collection"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <FileText className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(collection.num_documents)}
          </p>
          <p className="text-xs text-gray-500">Documents</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Grid3X3 className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <p className="text-lg font-bold text-gray-900">
            {collection.fields.length}
          </p>
          <p className="text-xs text-gray-500">Fields</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{facetedFields}</p>
          <p className="text-xs text-gray-500">Faceted</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {collection.fields.slice(0, 5).map((field) => (
          <Badge key={field.name} variant="default" className="font-mono text-xs">
            {field.name}:{" "}
            <span className="text-brand ml-1">{field.type}</span>
          </Badge>
        ))}
        {collection.fields.length > 5 && (
          <Badge variant="default">+{collection.fields.length - 5} more</Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {optionalFields > 0 && (
          <Badge variant="info">{optionalFields} optional</Badge>
        )}
        {collection.enable_nested_fields && (
          <Badge variant="success">Nested fields</Badge>
        )}
        {collection.default_sorting_field && (
          <Badge variant="default">
            Sort: {collection.default_sorting_field}
          </Badge>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
        <Link
          href={`/collections/${collection.name}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-brand hover:text-white rounded-lg text-sm font-medium text-gray-600 transition-all duration-150"
        >
          <FileText className="h-4 w-4" />
          Documents
        </Link>
        <Link
          href={`/collections/${collection.name}/synonyms`}
          className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-600 transition-colors"
        >
          Synonyms
        </Link>
        <Link
          href={`/collections/${collection.name}/rules`}
          className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-600 transition-colors"
        >
          Rules
        </Link>
      </div>
    </div>
  );
}
