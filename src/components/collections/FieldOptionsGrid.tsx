"use client";

import React from "react";
import { TOGGLE_OPTIONS, type ToggleKey } from "@/components/collections/schema-types";

export function FieldOptionsGrid({
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
