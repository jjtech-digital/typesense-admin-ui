"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { TypesenseSynonym, SynonymType } from "@/types/typesense";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface CreateSynonymModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  editSynonym?: TypesenseSynonym | null;
  onSuccess: () => void;
}

export function CreateSynonymModal({
  isOpen,
  onClose,
  collectionName,
  editSynonym,
  onSuccess,
}: CreateSynonymModalProps) {
  const [type, setType] = useState<SynonymType>("multi-way");
  const [root, setRoot] = useState("");
  const [synonymsInput, setSynonymsInput] = useState("");
  const [synonymsList, setSynonymsList] = useState<string[]>([]);
  const [customId, setCustomId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { getHeaders } = useConnectionConfig();

  useEffect(() => {
    if (editSynonym) {
      setType(editSynonym.root ? "one-way" : "multi-way");
      setRoot(editSynonym.root || "");
      setSynonymsList(editSynonym.synonyms);
      setCustomId(editSynonym.id);
    } else {
      setType("multi-way");
      setRoot("");
      setSynonymsList([]);
      setCustomId("");
    }
    setErrors({});
    setSynonymsInput("");
  }, [editSynonym, isOpen]);

  const addSynonym = () => {
    const trimmed = synonymsInput.trim();
    if (trimmed && !synonymsList.includes(trimmed)) {
      setSynonymsList((prev) => [...prev, trimmed]);
      setSynonymsInput("");
    }
  };

  const removeSynonym = (word: string) => {
    setSynonymsList((prev) => prev.filter((s) => s !== word));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSynonym();
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (type === "one-way" && !root.trim()) {
      newErrors.root = "Root word is required for one-way synonyms";
    }

    if (synonymsList.length < 1) {
      newErrors.synonyms = "At least one synonym word is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const synonymData = {
        synonyms: synonymsList,
        ...(type === "one-way" && root && { root: root.trim() }),
      };

      const id = editSynonym?.id || customId || `synonym-${Date.now()}`;
      const url = editSynonym
        ? `/api/collections/${collectionName}/synonyms/${editSynonym.id}`
        : `/api/collections/${collectionName}/synonyms`;

      const method = editSynonym ? "PUT" : "POST";

      const body = editSynonym ? synonymData : { id, ...synonymData };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save synonym");
      }

      success(editSynonym ? "Synonym updated successfully" : "Synonym created successfully");
      onClose();
      onSuccess();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save synonym");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!editSynonym;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Synonym" : "Create Synonym"}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            {isEditing ? "Update Synonym" : "Create Synonym"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Type selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Synonym Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType("multi-way")}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                type === "multi-way"
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <p className="font-medium text-sm">Multi-way</p>
              <p className="text-xs mt-0.5 opacity-70">
                All words are treated as synonyms of each other
              </p>
            </button>
            <button
              onClick={() => setType("one-way")}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                type === "one-way"
                  ? "border-brand bg-brand/5 text-brand"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <p className="font-medium text-sm">One-way</p>
              <p className="text-xs mt-0.5 opacity-70">
                Searching root returns synonyms too
              </p>
            </button>
          </div>
        </div>

        {/* ID */}
        {!isEditing && (
          <Input
            label="Synonym ID (optional)"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            placeholder="Auto-generated if empty"
            helperText="A unique identifier for this synonym"
          />
        )}

        {/* Root word for one-way */}
        {type === "one-way" && (
          <Input
            label="Root Word"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder="e.g., smartphone"
            error={errors.root}
            required
            helperText="Searching this word will also return results for the synonyms"
          />
        )}

        {/* Synonyms list */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {type === "one-way" ? "Synonym Words" : "Synonym Words"}{" "}
            <span className="text-red-500">*</span>
          </label>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={synonymsInput}
              onChange={(e) => setSynonymsInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                type === "one-way"
                  ? "e.g., mobile, cell phone"
                  : "e.g., car, automobile, vehicle"
              }
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <Button variant="outline" size="sm" onClick={addSynonym}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {errors.synonyms && (
            <p className="text-xs text-red-600 mb-2">{errors.synonyms}</p>
          )}

          {synonymsList.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px]">
              {synonymsList.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm"
                >
                  {word}
                  <button
                    onClick={() => removeSynonym(word)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-1">
            Press Enter or click Add to add each word
          </p>
        </div>
      </div>
    </Modal>
  );
}
