import type { TypesenseField, TypesenseFieldType } from "@/types/typesense";

export const FIELD_TYPES: TypesenseFieldType[] = [
  "string", "string[]", "int32", "int32[]", "int64", "int64[]",
  "float", "float[]", "bool", "bool[]", "geopoint", "geopoint[]",
  "auto", "object", "object[]", "image", "string*",
];

/** Boolean field options editable via the PATCH API */
export const TOGGLE_OPTIONS = [
  { key: "facet", label: "Facet", desc: "Enable faceted search", variant: "info" as const },
  { key: "optional", label: "Optional", desc: "Field can be omitted", variant: "warning" as const },
  { key: "sort", label: "Sort", desc: "Enable sorting", variant: "success" as const },
  { key: "infix", label: "Infix", desc: "Substring search", variant: "default" as const },
  { key: "index", label: "Index", desc: "Index this field", variant: "info" as const },
  { key: "stem", label: "Stem", desc: "Apply stemming", variant: "default" as const },
  { key: "store", label: "Store", desc: "Store on disk", variant: "default" as const },
  { key: "range_index", label: "Range Index", desc: "Optimize range filtering", variant: "default" as const },
] as const;

export type ToggleKey = (typeof TOGGLE_OPTIONS)[number]["key"];

export interface NewField {
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

export interface EditState {
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

export function blankField(): NewField {
  return {
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
  };
}

export function fieldToEditState(field: TypesenseField): EditState {
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

export function hasChanges(original: TypesenseField, edited: EditState): boolean {
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

export function badgeActiveClass(variant: "info" | "warning" | "success" | "danger" | "default"): string {
  switch (variant) {
    case "info": return "bg-blue-50 border-blue-200 text-blue-700";
    case "warning": return "bg-yellow-50 border-yellow-200 text-yellow-700";
    case "success": return "bg-green-50 border-green-200 text-green-700";
    case "danger": return "bg-red-50 border-red-200 text-red-700";
    default: return "bg-gray-100 border-gray-200 text-gray-600";
  }
}
