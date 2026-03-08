"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (keyValue: string) => void;
}

const AVAILABLE_ACTIONS = [
  { value: "*", label: "* (All actions)" },
  { value: "documents:search", label: "documents:search" },
  { value: "documents:get", label: "documents:get" },
  { value: "documents:create", label: "documents:create" },
  { value: "documents:upsert", label: "documents:upsert" },
  { value: "documents:update", label: "documents:update" },
  { value: "documents:delete", label: "documents:delete" },
  { value: "documents:import", label: "documents:import" },
  { value: "documents:export", label: "documents:export" },
  { value: "collections:list", label: "collections:list" },
  { value: "collections:get", label: "collections:get" },
  { value: "collections:create", label: "collections:create" },
  { value: "collections:delete", label: "collections:delete" },
  { value: "collections:*", label: "collections:* (All collection actions)" },
  { value: "aliases:*", label: "aliases:*" },
  { value: "synonyms:*", label: "synonyms:*" },
  { value: "overrides:*", label: "overrides:*" },
  { value: "keys:*", label: "keys:*" },
  { value: "metrics.json:list", label: "metrics.json:list" },
  { value: "stats.json:list", label: "stats.json:list" },
];

export function CreateKeyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateKeyModalProps) {
  const [description, setDescription] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>(["documents:search"]);
  const [collections, setCollections] = useState("*");
  const [expiresAt, setExpiresAt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  const toggleAction = (action: string) => {
    if (action === "*") {
      setSelectedActions(["*"]);
      return;
    }
    setSelectedActions((prev) => {
      const filtered = prev.filter((a) => a !== "*");
      if (filtered.includes(action)) {
        return filtered.filter((a) => a !== action);
      }
      return [...filtered, action];
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = "Description is required";
    if (selectedActions.length === 0) newErrors.actions = "Select at least one action";
    if (!collections.trim()) newErrors.collections = "Collections scope is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        description: description.trim(),
        actions: selectedActions,
        collections: collections.split(",").map((c) => c.trim()),
      };

      if (expiresAt) {
        body.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);
      }

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create API key");

      success("API key created successfully");
      onSuccess(data.value || "");
      onClose();
      resetForm();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setSelectedActions(["documents:search"]);
    setCollections("*");
    setExpiresAt("");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create API Key"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            Create Key
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Frontend search key"
          error={errors.description}
          required
        />

        {/* Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Actions <span className="text-red-500">*</span>
          </label>
          {errors.actions && (
            <p className="text-xs text-red-600 mb-2">{errors.actions}</p>
          )}
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {AVAILABLE_ACTIONS.map((action) => (
              <label
                key={action.value}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  selectedActions.includes(action.value)
                    ? "bg-brand/10 text-brand"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedActions.includes(action.value)}
                  onChange={() => toggleAction(action.value)}
                  className="rounded border-gray-300 text-brand focus:ring-brand"
                />
                <span className="font-mono text-xs">{action.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Collections scope */}
        <Input
          label="Collections Scope"
          value={collections}
          onChange={(e) => setCollections(e.target.value)}
          placeholder="* (all) or collection1,collection2"
          error={errors.collections}
          helperText="Comma-separated collection names, or * for all collections"
          required
        />

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expires At (optional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty for a non-expiring key
          </p>
        </div>
      </div>
    </Modal>
  );
}
