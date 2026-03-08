"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, GitMerge } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { OverridesList } from "@/components/overrides/OverridesList";

export default function OverridesPage() {
  const params = useParams();
  const name = params.name as string;

  return (
    <div>
      <Header />
      <div className="p-6 space-y-6">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-4">
          <Link
            href={`/collections/${name}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {name}
          </Link>

          <div className="ml-auto">
            <Link
              href={`/collections/${name}/synonyms`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              View Synonyms
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <OverridesList collectionName={name} />
        </div>
      </div>
    </div>
  );
}
