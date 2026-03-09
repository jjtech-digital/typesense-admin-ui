"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CurationRuleEditor } from "@/components/overrides/CurationRuleEditor";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";
import type { TypesenseOverride } from "@/types/typesense";

export default function EditCurationRulePage() {
  const params = useParams();
  const name = params.name as string;
  const id = params.id as string;
  const [override, setOverride] = useState<TypesenseOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const { getHeaders } = useConnectionConfig();
  const { error } = useToast();

  const fetchOverride = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/collections/${name}/overrides/${id}`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOverride(data);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch curation rule");
    } finally {
      setLoading(false);
    }
  }, [name, id, getHeaders, error]);

  useEffect(() => {
    fetchOverride();
  }, [fetchOverride]);

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-48 mb-4" />
            <div className="h-40 bg-gray-100 rounded" />
          </div>
        ) : override ? (
          <CurationRuleEditor collectionName={name} editOverride={override} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Curation rule not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
