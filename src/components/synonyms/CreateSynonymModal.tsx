"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ArrowRight, GitMerge } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { SynonymSet, SynonymType } from "@/types/typesense";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

// ── types ────────────────────────────────────────────────────────────────────

interface ItemDraft {
  _key: string;   // internal stable key for React
  id: string;
  type: SynonymType;
  root: string;
  synonymsInput: string;
  synonymsList: string[];
  errors: Record<string, string>;
}

interface CreateSynonymModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSet?: SynonymSet | null;
  onSuccess: () => void;
}

let _keyCounter = 0;
const nextKey = () => String(++_keyCounter);

function blankItem(): ItemDraft {
  return {
    _key: nextKey(),
    id: "",
    type: "multi-way",
    root: "",
    synonymsInput: "",
    synonymsList: [],
    errors: {},
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export function CreateSynonymModal({
  isOpen,
  onClose,
  editSet,
  onSuccess,
}: CreateSynonymModalProps) {
  const [setName, setSetName] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [setNameError, setSetNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { getConfig, getBaseUrl } = useConnectionConfig();

  const isEditing = !!editSet;

  // Populate form when editing
  useEffect(() => {
    if (editSet) {
      setSetName(editSet.name);
      setItems(
        (editSet.items ?? []).map((item) => ({
          _key: nextKey(),
          id: item.id,
          type: item.root ? "one-way" : "multi-way",
          root: item.root ?? "",
          synonymsInput: "",
          synonymsList: item.synonyms,
          errors: {},
        }))
      );
    } else {
      setSetName("");
      setItems([blankItem()]);
    }
    setSetNameError("");
  }, [editSet, isOpen]);

  // ── item helpers ────────────────────────────────────────────────────────────

  const updateItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, ...patch, errors: { ...it.errors, ...patch.errors } } : it))
    );
  };

  const addSynonymWord = (key: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it._key !== key) return it;
        const word = it.synonymsInput.trim();
        if (!word || it.synonymsList.includes(word)) return { ...it, synonymsInput: "" };
        return { ...it, synonymsList: [...it.synonymsList, word], synonymsInput: "" };
      })
    );
  };

  const removeSynonymWord = (key: string, word: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it._key === key ? { ...it, synonymsList: it.synonymsList.filter((s) => s !== word) } : it
      )
    );
  };

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it._key !== key) : prev));
  };

  // ── validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    let valid = true;

    // Set name
    if (!setName.trim()) {
      setSetNameError("Synonym set name is required");
      valid = false;
    } else {
      setSetNameError("");
    }

    // Items
    const updatedItems = items.map((it) => {
      const errs: Record<string, string> = {};
      if (!it.id.trim()) errs.id = "Item ID is required";
      if (it.type === "one-way" && !it.root.trim()) errs.root = "Root word is required for one-way synonyms";
      if (it.synonymsList.length < 1) errs.synonyms = "At least one synonym word is required";
      if (Object.keys(errs).length > 0) valid = false;
      return { ...it, errors: errs };
    });

    // Duplicate item IDs
    const ids = updatedItems.map((it) => it.id.trim()).filter(Boolean);
    ids.forEach((id, idx) => {
      if (ids.indexOf(id) !== idx) {
        updatedItems[idx] = {
          ...updatedItems[idx],
          errors: { ...updatedItems[idx].errors, id: "Duplicate item ID" },
        };
        valid = false;
      }
    });

    setItems(updatedItems);
    return valid;
  };

  // ── submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const cfg = getConfig();
      const baseUrl = getBaseUrl();
      if (!cfg || !baseUrl) throw new Error("No Typesense connection configured. Go to Settings first.");

      const body = {
        items: items.map((it) => ({
          id: it.id.trim(),
          synonyms: it.synonymsList,
          ...(it.type === "one-way" && it.root.trim() ? { root: it.root.trim() } : {}),
        })),
      };

      const res = await fetch(
        `${baseUrl}/synonym_sets/${encodeURIComponent(setName.trim())}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": cfg.apiKey,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save synonym set");

      success(isEditing ? "Synonym set updated" : "Synonym set created");
      onClose();
      onSuccess();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to save synonym set");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit: ${editSet!.name}` : "New Synonym Set"}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            {isEditing ? "Update Set" : "Create Set"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Set name */}
        <Input
          label="Synonym Set Name"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          placeholder="e.g., clothing-synonyms"
          error={setNameError}
          disabled={isEditing}
          required
          helperText={
            isEditing
              ? "Set name cannot be changed after creation"
              : "A unique name for this synonym set"
          }
        />

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Synonym Items <span className="text-red-500">*</span>
            </label>
            <Button variant="outline" size="sm" onClick={addItem} disabled={isSubmitting}>
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {items.map((item, idx) => (
            <div
              key={item._key}
              className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50"
            >
              {/* Item header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item {idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item._key)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Item ID */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Item ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.id}
                  onChange={(e) => updateItem(item._key, { id: e.target.value })}
                  placeholder="e.g., syn-clothing-general"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand ${
                    item.errors.id ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {item.errors.id && (
                  <p className="text-xs text-red-600 mt-1">{item.errors.id}</p>
                )}
              </div>

              {/* Type toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateItem(item._key, { type: "multi-way", root: "" })}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                      item.type === "multi-way"
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <GitMerge className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium">Multi-way</p>
                      <p className="text-xs opacity-60">All words are equivalent</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItem(item._key, { type: "one-way" })}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                      item.type === "one-way"
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium">One-way</p>
                      <p className="text-xs opacity-60">Root maps to synonyms</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Root word */}
              {item.type === "one-way" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Root Word <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.root}
                    onChange={(e) => updateItem(item._key, { root: e.target.value })}
                    placeholder="e.g., smartphone"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand ${
                      item.errors.root ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {item.errors.root && (
                    <p className="text-xs text-red-600 mt-1">{item.errors.root}</p>
                  )}
                </div>
              )}

              {/* Synonyms */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Synonym Words <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item.synonymsInput}
                    onChange={(e) => updateItem(item._key, { synonymsInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSynonymWord(item._key);
                      }
                    }}
                    placeholder={
                      item.type === "one-way" ? "e.g., mobile, cell phone" : "e.g., car, auto"
                    }
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSynonymWord(item._key)}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {item.errors.synonyms && (
                  <p className="text-xs text-red-600 mb-2">{item.errors.synonyms}</p>
                )}

                {item.synonymsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-white border border-gray-200 rounded-lg min-h-[40px]">
                    {item.synonymsList.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                      >
                        {word}
                        <button
                          onClick={() => removeSynonymWord(item._key, word)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-1">
                  Press Enter or click Add after each word
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
