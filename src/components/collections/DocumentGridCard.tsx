"use client";

import React from "react";
import { FileText } from "lucide-react";
import { findFirstImage, findField, TITLE_FIELDS, SUBTITLE_FIELDS, PRICE_FIELDS } from "@/components/collections/document-utils";
import { formatValue } from "@/components/collections/formatValue";

export function DocumentGridCard({ doc }: { doc: Record<string, unknown> }) {
  const imageUrl = findFirstImage(doc);
  const titleKey = findField(doc, TITLE_FIELDS);
  const subtitleKey = findField(doc, SUBTITLE_FIELDS);
  const priceKey = findField(doc, PRICE_FIELDS);

  const title = titleKey ? String(doc[titleKey]) : String(doc.id ?? "—");
  const subtitle = subtitleKey ? String(doc[subtitleKey]) : null;

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden hover:border-brand hover:shadow-md transition-all group cursor-pointer">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-10 w-10 text-gray-200" />
          </div>
        )}
        {doc.isAvailable !== undefined && (
          <div className="absolute top-2 right-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${doc.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {doc.isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-mono truncate">{subtitle}</p>}
        {priceKey && doc[priceKey] !== null && (
          <p className="text-sm font-bold text-gray-900">{formatValue(doc[priceKey])}</p>
        )}
        <p className="text-xs text-gray-400 font-mono truncate">id: {String(doc.id ?? "—")}</p>
      </div>
    </div>
  );
}
