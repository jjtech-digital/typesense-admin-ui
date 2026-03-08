"use client";

import React, { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import type { TypesenseField } from "@/types/typesense";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_TYPES = [
  { value: "string", label: "string" },
  { value: "string[]", label: "string[]" },
  { value: "int32", label: "int32" },
  { value: "int64", label: "int64" },
  { value: "int32[]", label: "int32[]" },
  { value: "int64[]", label: "int64[]" },
  { value: "float", label: "float" },
  { value: "float[]", label: "float[]" },
  { value: "bool", label: "bool" },
  { value: "bool[]", label: "bool[]" },
  { value: "geopoint", label: "geopoint" },
  { value: "object", label: "object" },
  { value: "object[]", label: "object[]" },
  { value: "auto", label: "auto" },
];

interface FieldRow extends TypesenseField {
  _id: string;
}

export function CreateCollectionModal({
  isOpen,
  onClose,
}: CreateCollectionModalProps) {
  const [name, setName] = useState("");
  const [defaultSortingField, setDefaultSortingField] = useState("");
  const [enableNestedFields, setEnableNestedFields] = useState(false);
  const [fields, setFields] = useState<FieldRow[]>([
    {
      _id: "1",
      name: "",
      type: "string",
      facet: false,
      optional: false,
      index: true,
    },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();
  const router = useRouter();
  const { getHeaders } = useConnectionConfig();

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        _id: Math.random().toString(36).substr(2, 9),
        name: "",
        type: "string",
        facet: false,
        optional: false,
        index: true,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f._id !== id));
  };

  const updateField = (id: string, updates: Partial<FieldRow>) => {
    setFields((prev) =>
      prev.map((f) => (f._id === id ? { ...f, ...updates } : f))
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Collection name is required";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      newErrors.name =
        "Only alphanumeric characters, hyphens, and underscores allowed";
    }

    fields.forEach((field, i) => {
      if (!field.name.trim()) {
        newErrors[`field_${i}_name`] = "Field name is required";
      }
    });

    if (fields.length === 0) {
      newErrors.fields = "At least one field is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const body = {
        name: name.trim(),
        fields: fields.map(({ _id, ...field }) => ({
          ...field,
          name: field.name.trim(),
        })),
        ...(defaultSortingField && {
          default_sorting_field: defaultSortingField,
        }),
        ...(enableNestedFields && { enable_nested_fields: true }),
      };

      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create collection");
      }

      success(`Collection "${name}" created successfully`);
      onClose();
      resetForm();
      router.refresh();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDefaultSortingField("");
    setEnableNestedFields(false);
    setFields([
      {
        _id: "1",
        name: "",
        type: "string",
        facet: false,
        optional: false,
        index: true,
      },
    ]);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const numericFields = fields.filter(
    (f) =>
      f.name &&
      ["int32", "int64", "float"].includes(f.type)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Collection"
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Create Collection
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Collection Name */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Collection Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., products"
            error={errors.name}
            required
          />
          <Select
            label="Default Sorting Field"
            value={defaultSortingField}
            onChange={(e) => setDefaultSortingField(e.target.value)}
            options={[
              { value: "", label: "None" },
              ...numericFields.map((f) => ({ value: f.name, label: f.name })),
            ]}
            helperText="Must be a numeric field"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enable-nested"
            checked={enableNestedFields}
            onChange={(e) => setEnableNestedFields(e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand"
          />
          <label htmlFor="enable-nested" className="text-sm text-gray-700">
            Enable nested fields (for object types)
          </label>
        </div>

        {/* Fields */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Schema Fields
            </h3>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </div>

          {errors.fields && (
            <p className="text-xs text-red-600 mb-2">{errors.fields}</p>
          )}

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">Field Name</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-1 text-center">Facet</div>
              <div className="col-span-1 text-center">Optional</div>
              <div className="col-span-1 text-center">Index</div>
              <div className="col-span-1 text-center">Sort</div>
              <div className="col-span-1"></div>
            </div>

            {fields.map((field, i) => (
              <div
                key={field._id}
                className="grid grid-cols-12 gap-2 items-center p-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="col-span-4">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) =>
                      updateField(field._id, { name: e.target.value })
                    }
                    placeholder="field_name"
                    className={`w-full px-2 py-1.5 text-sm border rounded font-mono focus:outline-none focus:ring-1 focus:ring-brand ${
                      errors[`field_${i}_name`]
                        ? "border-red-400"
                        : "border-gray-300"
                    }`}
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(field._id, {
                        type: e.target.value as TypesenseField["type"],
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.facet || false}
                    onChange={(e) =>
                      updateField(field._id, { facet: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.optional || false}
                    onChange={(e) =>
                      updateField(field._id, { optional: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.index !== false}
                    onChange={(e) =>
                      updateField(field._id, { index: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.sort || false}
                    onChange={(e) =>
                      updateField(field._id, { sort: e.target.checked })
                    }
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                    disabled={!["int32", "int64", "float"].includes(field.type)}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeField(field._id)}
                    disabled={fields.length === 1}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
