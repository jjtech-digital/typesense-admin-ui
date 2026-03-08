"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Database, GitMerge, Filter, ArrowLeft, Grid3X3 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { DocumentsTable } from "@/components/collections/DocumentsTable";
import { Badge } from "@/components/ui/Badge";
import type { TypesenseCollection } from "@/types/typesense";
import { getFieldTypeColor, formatNumber, formatDate } from "@/lib/utils";
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

  useEffect(() => {
    async function fetchCollection() {
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
    }
    fetchCollection();
  }, [name, getHeaders, error]);

  const tabs = [
    { id: "documents", label: "Documents", icon: <Database className="h-4 w-4" /> },
    { id: "schema", label: "Schema", icon: <Grid3X3 className="h-4 w-4" /> },
  ];

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/collections"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Collections
          </Link>

          <div className="flex items-center gap-3 ml-auto">
            <Link
              href={`/collections/${name}/synonyms`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              Synonyms
            </Link>
            <Link
              href={`/collections/${name}/overrides`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Overrides
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Database className="h-6 w-6 text-brand" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {collection.name}
                  </h2>
                  {collection.created_at && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Created {formatDate(collection.created_at)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(collection.num_documents)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Documents</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {collection.fields.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Fields</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-2xl font-bold text-gray-900">
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <DocumentsTable collection={collection} />
              </div>
            )}

            {activeTab === "schema" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Schema Fields
                </h3>
                <div className="space-y-2">
                  {collection.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex-1">
                        <span className="font-mono font-medium text-gray-900">
                          {field.name}
                        </span>
                      </div>
                      <Badge
                        variant="custom"
                        className={getFieldTypeColor(field.type)}
                      >
                        {field.type}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {field.facet && (
                          <Badge variant="info">facet</Badge>
                        )}
                        {field.optional && (
                          <Badge variant="warning">optional</Badge>
                        )}
                        {field.index === false && (
                          <Badge variant="danger">no-index</Badge>
                        )}
                        {field.sort && (
                          <Badge variant="success">sort</Badge>
                        )}
                        {field.infix && (
                          <Badge variant="default">infix</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
