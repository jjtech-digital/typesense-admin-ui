"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { TypesenseCollection, TypesenseSearchResult } from "@/types/typesense";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getFieldTypeColor, truncate } from "@/lib/utils";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface DocumentsTableProps {
  collection: TypesenseCollection;
}

const PER_PAGE = 25;

export function DocumentsTable({ collection }: DocumentsTableProps) {
  const [query, setQuery] = useState("*");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<TypesenseSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getHeaders } = useConnectionConfig();

  const displayFields = collection.fields
    .filter((f) => f.name !== "id")
    .slice(0, 8);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        per_page: PER_PAGE.toString(),
      });

      const res = await fetch(
        `/api/collections/${collection.name}/documents?${params}`,
        { headers: getHeaders() }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  }, [collection.name, query, page, getHeaders]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput || "*");
    setPage(1);
  };

  const totalPages = results ? Math.ceil(results.found / PER_PAGE) : 0;

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return truncate(String(value), 60);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search documents... (leave empty for all, use * for wildcard)'
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Button type="submit" variant="primary">
          Search
        </Button>
        {query !== "*" && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchInput("");
              setQuery("*");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Schema fields reference */}
      <div className="flex flex-wrap gap-1.5">
        {collection.fields.map((field) => (
          <Badge
            key={field.name}
            variant="custom"
            className={getFieldTypeColor(field.type)}
          >
            {field.name}: {field.type}
          </Badge>
        ))}
      </div>

      {/* Results info */}
      {results && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {results.found > 0 ? (
              <>
                Showing{" "}
                <strong className="text-gray-900">
                  {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, results.found)}
                </strong>{" "}
                of <strong className="text-gray-900">{results.found.toLocaleString()}</strong>{" "}
                documents
              </>
            ) : (
              "No documents found"
            )}
          </span>
          <span className="text-xs">
            Search time: {results.search_time_ms}ms
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="w-24">ID</TableHeader>
            {displayFields.map((field) => (
              <TableHeader key={field.name}>
                <span>{field.name}</span>
                <Badge
                  variant="custom"
                  className={`ml-1.5 ${getFieldTypeColor(field.type)}`}
                >
                  {field.type}
                </Badge>
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={displayFields.length + 1}>
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))
          ) : results?.hits && results.hits.length > 0 ? (
            results.hits.map((hit, i) => (
              <TableRow key={hit.document.id || i}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    {hit.document.id}
                  </span>
                </TableCell>
                {displayFields.map((field) => (
                  <TableCell key={field.name}>
                    <span
                      className={`text-sm ${
                        typeof hit.document[field.name] === "boolean"
                          ? "font-mono text-purple-600"
                          : typeof hit.document[field.name] === "number"
                          ? "font-mono text-green-600"
                          : "text-gray-700"
                      }`}
                    >
                      {formatCellValue(hit.document[field.name])}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableEmpty
              colSpan={displayFields.length + 1}
              message={query !== "*" ? `No documents matching "${query}"` : "No documents in this collection"}
              icon={<FileText className="h-10 w-10" />}
            />
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    page === pageNum
                      ? "bg-brand text-white font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
