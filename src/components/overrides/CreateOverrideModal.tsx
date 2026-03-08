"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { TypesenseOverride } from "@/types/typesense";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface CreateOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  editOverride?: TypesenseOverride | null;
  onSuccess: () => void;
}

interface IncludeEntry {
  id: string;
  position: number;
}

interface ExcludeEntry {
  id: string;
}

export function CreateOverrideModal({
  isOpen,
  onClose,
  collectionName,
  editOverride,
  onSuccess,
}: CreateOverrideModalProps) {
  const [overrideId, setOverrideId] = useState("");
  const [query, setQuery] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "contains">("exact");
  const [filterBy, setFilterBy] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [includes, setIncludes] = useState<IncludeEntry[]>([]);
  const [excludes, setExcludes] = useState<ExcludeEntry[]>([]);
  const [includeId, setIncludeId] = useState("");
  const [includePos, setIncludePos] = useState("1");
  const [excludeId, setExcludeId] = useState("");
  const [stopProcessing, setStopProcessing] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  useEffect(() => {
    if (editOverride) {
      setOverrideId(editOverride.id);
      setQuery(editOverride.rule.query);
      setMatchType(editOverride.rule.match);
      setFilterBy(editOverride.filter_by || "");
      setSortBy(editOverride.sort_by || "");
      setReplaceQuery(editOverride.replace_query || "");
      setIncludes(editOverride.includes || []);
      setExcludes(editOverride.excludes || []);
      setStopProcessing(editOverride.stop_processing !== false);
    } else {
      setOverrideId("");
      setQuery("");
      setMatchType("exact");
      setFilterBy("");
      setSortBy("");
      setReplaceQuery("");
      setIncludes([]);
      setExcludes([]);
      setStopProcessing(true);
    }
    setErrors({});
  }, [editOverride, isOpen]);

  const addInclude = () => {
    if (includeId.trim()) {
      setIncludes((prev) => [
        ...prev,
        { id: includeId.trim(), position: parseInt(includePos, 10) || 1 },
      ]);
      setIncludeId("");
      setIncludePos("1");
    }
  };

  const addExclude = () => {
    if (excludeId.trim()) {
      setExcludes((prev) => [...prev, { id: excludeId.trim() }]);
      setExcludeId("");
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!query.trim()) newErrors.query = "Query is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const overrideData = {
        rule: { query: query.trim(), match: matchType },
        ...(includes.length > 0 && { includes }),
        ...(excludes.length > 0 && { excludes }),
        ...(filterBy && { filter_by: filterBy }),
        ...(sortBy && { sort_by: sortBy }),
        ...(replaceQuery && { replace_query: replaceQuery }),
        stop_processing: stopProcessing,
      };

      const id = editOverride?.id || overrideId || `override-${Date.now()}`;
      const url = editOverride
        ? `/api/collections/${collectionName}/overrides/${editOverride.id}`
        : `/api/collections/${collectionName}/overrides`;

      const method = editOverride ? "PUT" : "POST";
      const body = editOverride ? overrideData : { id, ...overrideData };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save override");

      success(editOverride ? "Override updated" : "Override created");
      onClose();
      onSuccess();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editOverride ? "Edit Override" : "Create Override"}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            {editOverride ? "Update Override" : "Create Override"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ID */}
        {!editOverride && (
          <Input
            label="Override ID (optional)"
            value={overrideId}
            onChange={(e) => setOverrideId(e.target.value)}
            placeholder="Auto-generated if empty"
          />
        )}

        {/* Rule */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., iphone"
            error={errors.query}
            required
            helperText="Trigger query for this override"
          />
          <Select
            label="Match Type"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as "exact" | "contains")}
            options={[
              { value: "exact", label: "Exact match" },
              { value: "contains", label: "Contains" },
            ]}
          />
        </div>

        {/* Include documents */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Include Documents (Pin to Position)
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={includeId}
              onChange={(e) => setIncludeId(e.target.value)}
              placeholder="Document ID"
            />
            <input
              type="number"
              min="1"
              value={includePos}
              onChange={(e) => setIncludePos(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Pos"
            />
            <Button variant="outline" size="sm" onClick={addInclude}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {includes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {includes.map((inc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
                >
                  ID: {inc.id} → pos {inc.position}
                  <button onClick={() => setIncludes((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-green-400 hover:text-green-700" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Exclude documents */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exclude Documents
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={excludeId}
              onChange={(e) => setExcludeId(e.target.value)}
              placeholder="Document ID to exclude"
            />
            <Button variant="outline" size="sm" onClick={addExclude}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {excludes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {excludes.map((exc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
                >
                  {exc.id}
                  <button onClick={() => setExcludes((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-red-400 hover:text-red-700" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Advanced options */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Filter By"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            placeholder="e.g., brand:= Apple"
            helperText="Apply a filter when this query is matched"
          />
          <Input
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            placeholder="e.g., popularity:desc"
            helperText="Override sort order for this query"
          />
        </div>

        <Input
          label="Replace Query"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder="e.g., smartphone"
          helperText="Replace the query with this alternative"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="stop-processing"
            checked={stopProcessing}
            onChange={(e) => setStopProcessing(e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand"
          />
          <label htmlFor="stop-processing" className="text-sm text-gray-700">
            Stop processing (don&apos;t apply subsequent overrides)
          </label>
        </div>
      </div>
    </Modal>
  );
}
