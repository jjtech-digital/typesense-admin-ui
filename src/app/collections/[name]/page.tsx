"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Database, GitMerge, Filter, ArrowLeft, Grid3X3 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { DocumentsTable } from "@/components/collections/DocumentsTable";
import { SchemaEditor } from "@/components/collections/SchemaEditor";
import type { TypesenseCollection } from "@/types/typesense";
import { formatNumber, formatDate } from "@/lib/utils";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";

export default function CollectionDetailPage() {
  const params = useParams();
  const name = params.name as string;
  const [collection, setCollection] = useState<TypesenseCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "schema">("documents");
  const { getHeaders } = useConnectionConfig();
  const { error } = useToast();

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${name}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCollection(data);
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Failed to fetch collection"
      );
    } finally {
      setLoading(false);
    }
  }, [name, getHeaders, error]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const tabs = [
    { id: "documents", label: "Documents", icon: <Database className="h-4 w-4" /> },
    { id: "schema", label: "Schema", icon: <Grid3X3 className="h-4 w-4" /> },
  ];

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/collections"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Collections
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Link
              href={`/collections/${name}/synonyms`}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              <span className="hidden sm:inline">Synonyms</span>
              <span className="sm:hidden">Syn</span>
            </Link>
            <Link
              href={`/collections/${name}/rules`}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Curation Rules</span>
              <span className="sm:hidden">Rules</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-48 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        ) : collection ? (
          <>
            {/* Collection header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Database className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      {collection.name}
                    </h2>
                    {collection.created_at && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Created {formatDate(collection.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center w-full sm:w-auto sm:ml-auto">
                  <div className="bg-gray-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">
                      {formatNumber(collection.num_documents)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Documents</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">
                      {collection.fields.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Fields</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">
                      {collection.fields.filter((f) => f.facet).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Faceted</p>
                  </div>
                </div>
              </div>

              {collection.default_sorting_field && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    Default sorting:{" "}
                    <span className="font-mono text-gray-700">
                      {collection.default_sorting_field}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as "documents" | "schema")
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "documents" && (
              <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
                <DocumentsTable collection={collection} />
              </div>
            )}

            {activeTab === "schema" && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <SchemaEditor collection={collection} onUpdated={fetchCollection} />
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Database className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Collection not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
