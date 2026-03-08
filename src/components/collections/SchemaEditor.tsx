"use client";

import React, { useState } from "react";
import { Plus, Trash2, X, Save, AlertTriangle, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import type { TypesenseCollection, TypesenseField, TypesenseFieldType } from "@/types/typesense";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getFieldTypeColor } from "@/lib/utils";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";

const FIELD_TYPES: TypesenseFieldType[] = [
  "string", "string[]", "int32", "int32[]", "int64", "int64[]",
  "float", "float[]", "bool", "bool[]", "geopoint", "geopoint[]",
  "auto", "object", "object[]", "image", "string*",
];

/** Boolean field options editable via the PATCH API */
const TOGGLE_OPTIONS = [
  { key: "facet", label: "Facet", desc: "Enable faceted search", variant: "info" as const },
  { key: "optional", label: "Optional", desc: "Field can be omitted", variant: "warning" as const },
  { key: "sort", label: "Sort", desc: "Enable sorting", variant: "success" as const },
  { key: "infix", label: "Infix", desc: "Substring search", variant: "default" as const },
  { key: "index", label: "Index", desc: "Index this field", variant: "info" as const },
  { key: "stem", label: "Stem", desc: "Apply stemming", variant: "default" as const },
  { key: "store", label: "Store", desc: "Store on disk", variant: "default" as const },
  { key: "range_index", label: "Range Index", desc: "Optimize range filtering", variant: "default" as const },
] as const;

type ToggleKey = (typeof TOGGLE_OPTIONS)[number]["key"];

interface SchemaEditorProps {
  collection: TypesenseCollection;
  onUpdated: () => void;
}

interface NewField {
  name: string;
  type: TypesenseFieldType;
  facet: boolean;
  optional: boolean;
  index: boolean;
  sort: boolean;
  infix: boolean;
  locale: string;
  stem: boolean;
  store: boolean;
  range_index: boolean;
}

interface EditState {
  facet: boolean;
  optional: boolean;
  sort: boolean;
  infix: boolean;
  index: boolean;
  stem: boolean;
  store: boolean;
  range_index: boolean;
  locale: string;
}

const blankField = (): NewField => ({
  name: "",
  type: "string",
  facet: false,
  optional: false,
  index: true,
  sort: false,
  infix: false,
  locale: "",
  stem: false,
  store: true,
  range_index: false,
});

function fieldToEditState(field: TypesenseField): EditState {
  return {
    facet: field.facet ?? false,
    optional: field.optional ?? false,
    sort: field.sort ?? false,
    infix: field.infix ?? false,
    index: field.index !== false,
    stem: field.stem ?? false,
    store: field.store !== false,
    range_index: field.range_index ?? false,
    locale: field.locale ?? "",
  };
}

function hasChanges(original: TypesenseField, edited: EditState): boolean {
  const orig = fieldToEditState(original);
  return (
    orig.facet !== edited.facet ||
    orig.optional !== edited.optional ||
    orig.sort !== edited.sort ||
    orig.infix !== edited.infix ||
    orig.index !== edited.index ||
    orig.stem !== edited.stem ||
    orig.store !== edited.store ||
    orig.range_index !== edited.range_index ||
    orig.locale !== edited.locale
  );
}

export function SchemaEditor({ collection, onUpdated }: SchemaEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState<NewField>(blankField());
  const [dropTarget, setDropTarget] = useState<TypesenseField | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const { getConfig, getBaseUrl } = useConnectionConfig();
  const { success, error } = useToast();

  const patchSchema = async (fields: Record<string, unknown>[]) => {
    const cfg = getConfig();
    const baseUrl = getBaseUrl();
    if (!cfg || !baseUrl) throw new Error("Not connected to Typesense");
    const res = await fetch(`${baseUrl}/collections/${collection.name}`, {
      method: "PATCH",
      headers: {
        "X-TYPESENSE-API-KEY": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Schema update failed");
    return data;
  };

  // ── Add field ──────────────────────────────────────────────────────────────

  const handleAddField = async () => {
    setAddError(null);
    if (!newField.name.trim()) { setAddError("Field name is required"); return; }
    if (collection.fields.some((f) => f.name === newField.name.trim())) {
      setAddError("A field with this name already exists");
      return;
    }

    setSaving(true);
    try {
      const field: Record<string, unknown> = {
        name: newField.name.trim(),
        type: newField.type,
      };
      if (newField.facet) field.facet = true;
      if (newField.optional) field.optional = true;
      if (!newField.index) field.index = false;
      if (newField.sort) field.sort = true;
      if (newField.infix) field.infix = true;
      if (newField.locale) field.locale = newField.locale;
      if (newField.stem) field.stem = true;
      if (!newField.store) field.store = false;
      if (newField.range_index) field.range_index = true;

      await patchSchema([field]);
      success(`Field "${newField.name}" added to schema`);
      setNewField(blankField());
      setShowAddForm(false);
      onUpdated();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add field");
    } finally {
      setSaving(false);
    }
  };

  // ── Drop field ─────────────────────────────────────────────────────────────

  const handleDropField = async () => {
    if (!dropTarget) return;
    setDropping(true);
    try {
      await patchSchema([{ name: dropTarget.name, type: dropTarget.type, drop: true }]);
      success(`Field "${dropTarget.name}" removed from schema`);
      setDropTarget(null);
      if (editingField === dropTarget.name) { setEditingField(null); setEditState(null); }
      onUpdated();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to remove field");
    } finally {
      setDropping(false);
    }
  };

  // ── Edit field (drop + re-add in one PATCH) ────────────────────────────────

  const startEdit = (field: TypesenseField) => {
    if (editingField === field.name) {
      setEditingField(null);
      setEditState(null);
      setEditError(null);
    } else {
      setEditingField(field.name);
      setEditState(fieldToEditState(field));
      setEditError(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editState) return;
    const original = collection.fields.find((f) => f.name === editingField);
    if (!original) return;
    if (!hasChanges(original, editState)) {
      setEditingField(null);
      setEditState(null);
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      // Typesense requires drop + re-add to change field properties
      const dropField: Record<string, unknown> = {
        name: original.name,
        type: original.type,
        drop: true,
      };
      const addField: Record<string, unknown> = {
        name: original.name,
        type: original.type,
      };
      // Set all boolean properties explicitly
      if (editState.facet) addField.facet = true;
      if (editState.optional) addField.optional = true;
      if (!editState.index) addField.index = false;
      if (editState.sort) addField.sort = true;
      if (editState.infix) addField.infix = true;
      if (editState.stem) addField.stem = true;
      if (!editState.store) addField.store = false;
      if (editState.range_index) addField.range_index = true;
      if (editState.locale) addField.locale = editState.locale;
      // Preserve non-editable properties
      if (original.num_dim) addField.num_dim = original.num_dim;
      if (original.vec_dist) addField.vec_dist = original.vec_dist;
      if (original.reference) addField.reference = original.reference;

      await patchSchema([dropField, addField]);
      success(`Field "${original.name}" updated`);
      setEditingField(null);
      setEditState(null);
      onUpdated();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update field");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Badge rendering ────────────────────────────────────────────────────────

  const fieldBadges = (field: TypesenseField) => {
    const badges: { label: string; variant: "info" | "warning" | "success" | "danger" | "default" }[] = [];
    if (field.facet) badges.push({ label: "facet", variant: "info" });
    if (field.optional) badges.push({ label: "optional", variant: "warning" });
    if (field.sort) badges.push({ label: "sort", variant: "success" });
    if (field.index === false) badges.push({ label: "no-index", variant: "danger" });
    if (field.infix) badges.push({ label: "infix", variant: "default" });
    if (field.stem) badges.push({ label: "stem", variant: "default" });
    if (field.locale) badges.push({ label: field.locale, variant: "default" });
    if (field.store === false) badges.push({ label: "no-store", variant: "danger" });
    if (field.range_index) badges.push({ label: "range", variant: "default" });
    if (field.num_dim) badges.push({ label: `${field.num_dim}d`, variant: "default" });
    if (field.reference) badges.push({ label: `ref:${field.reference}`, variant: "info" });
    return badges;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Schema Fields
          <span className="text-sm font-normal text-gray-400 ml-2">{collection.fields.length}</span>
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setShowAddForm(true); setAddError(null); }}
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {/* Add field form */}
      {showAddForm && (
        <div className="mb-4 border border-brand/30 bg-brand/5 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">New Field</h4>
            <button
              onClick={() => { setShowAddForm(false); setAddError(null); }}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Name + Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field Name</label>
              <input
                type="text"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="e.g. price, category, brand"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value as TypesenseFieldType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle options */}
          <FieldOptionsGrid
            state={newField}
            onChange={(key, val) => setNewField({ ...newField, [key]: val })}
          />

          {/* Locale */}
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Locale <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={newField.locale}
              onChange={(e) => setNewField({ ...newField, locale: e.target.value })}
              placeholder="e.g. en, el, ja"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>

          {addError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={handleAddField} loading={saving}>
              <Save className="h-3.5 w-3.5" />
              Add to Schema
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setAddError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Fields list */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {collection.fields.map((field, i) => {
          const badges = fieldBadges(field);
          const isEditing = editingField === field.name;
          const changed = isEditing && editState ? hasChanges(field, editState) : false;

          return (
            <div key={field.name} className={i > 0 ? "border-t border-gray-100" : ""}>
              {/* Field row */}
              <div
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 group cursor-pointer transition-colors ${
                  isEditing ? "bg-brand/5" : i % 2 === 1 ? "bg-gray-50/60 hover:bg-gray-100/60" : "bg-white hover:bg-gray-50/60"
                }`}
                onClick={() => startEdit(field)}
              >
                {/* Expand indicator */}
                <span className="flex-shrink-0 text-gray-300">
                  {isEditing
                    ? <ChevronDown className="h-3.5 w-3.5 text-brand" />
                    : <ChevronRight className="h-3.5 w-3.5" />
                  }
                </span>

                {/* Field name */}
                <span className="font-mono text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                  {field.name}
                </span>

                {/* Badges: type + properties */}
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <Badge variant="custom" className={getFieldTypeColor(field.type)}>
                    {field.type}
                  </Badge>
                  {badges.map((b) => (
                    <Badge key={b.label} variant={b.variant}>{b.label}</Badge>
                  ))}
                </div>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(field); }}
                    className="p-1 rounded text-gray-300 hover:text-brand hover:bg-brand/10 transition-colors"
                    title="Edit field properties"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDropTarget(field); }}
                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title={`Remove "${field.name}"`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline edit panel */}
              {isEditing && editState && (
                <div className="px-4 sm:px-6 pb-4 pt-2 bg-brand/5 border-t border-brand/10 space-y-3">
                  <p className="text-xs text-gray-500">
                    Edit properties for <span className="font-mono font-medium text-gray-700">{field.name}</span> ({field.type})
                  </p>

                  {/* Toggleable badges — click to toggle */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Properties</label>
                    <div className="flex flex-wrap gap-2">
                      {TOGGLE_OPTIONS.map(({ key, label, desc, variant }) => {
                        const active = editState[key as ToggleKey] as boolean;
                        // For "index" and "store", the default is true, so active means the normal state
                        const isNegative = key === "index" || key === "store";
                        return (
                          <button
                            key={key}
                            onClick={() => setEditState({ ...editState, [key]: !active })}
                            title={desc}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              active
                                ? key === "index" || key === "store"
                                  ? "bg-white border-gray-200 text-gray-500"
                                  : badgeActiveClass(variant)
                                : isNegative
                                  ? "bg-red-50 border-red-200 text-red-600"
                                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              active
                                ? isNegative ? "bg-gray-300" : "bg-current"
                                : isNegative ? "bg-red-400" : "bg-gray-200"
                            }`} />
                            {isNegative && !active ? `no-${label.toLowerCase()}` : label.toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Locale */}
                  <div className="max-w-xs">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Locale</label>
                    <input
                      type="text"
                      value={editState.locale}
                      onChange={(e) => setEditState({ ...editState, locale: e.target.value })}
                      placeholder="e.g. en, el, ja"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                  </div>

                  {editError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveEdit}
                      loading={editSaving}
                      disabled={!changed}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingField(null); setEditState(null); setEditError(null); }}>
                      Cancel
                    </Button>
                    {changed && (
                      <span className="text-xs text-amber-600 ml-auto">Unsaved changes</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {collection.fields.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-400 text-sm">
            No fields defined
          </div>
        )}
      </div>

      {/* Drop confirmation modal */}
      {dropTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Remove Field</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Drop <span className="font-mono font-medium text-gray-900">{dropTarget.name}</span> ({dropTarget.type}) from the schema?
                </p>
                <p className="text-xs text-red-500 mt-2">
                  This will remove the field and its data from all documents. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDropTarget(null)}
                  disabled={dropping}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDropField}
                  loading={dropping}
                >
                  <Trash2 className="h-4 w-4" />
                  Drop Field
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared checkbox grid for add-field form ──────────────────────────────────

function FieldOptionsGrid({
  state,
  onChange,
}: {
  state: { facet: boolean; optional: boolean; sort: boolean; infix: boolean; index: boolean; stem: boolean; store: boolean; range_index: boolean };
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">Options</label>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {TOGGLE_OPTIONS.map(({ key, label, desc }) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer" title={desc}>
            <input
              type="checkbox"
              checked={state[key as ToggleKey] as boolean}
              onChange={(e) => onChange(key, e.target.checked)}
              className="rounded border-gray-300 text-brand focus:ring-brand h-3.5 w-3.5"
            />
            <span className="text-xs text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Badge active class helper ────────────────────────────────────────────────

function badgeActiveClass(variant: "info" | "warning" | "success" | "danger" | "default"): string {
  switch (variant) {
    case "info": return "bg-blue-50 border-blue-200 text-blue-700";
    case "warning": return "bg-yellow-50 border-yellow-200 text-yellow-700";
    case "success": return "bg-green-50 border-green-200 text-green-700";
    case "danger": return "bg-red-50 border-red-200 text-red-700";
    default: return "bg-gray-100 border-gray-200 text-gray-600";
  }
}
