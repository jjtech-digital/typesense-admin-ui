"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Filter, GitMerge } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SynonymsList } from "@/components/synonyms/SynonymsList";

export default function SynonymsPage() {
  const params = useParams();
  const name = params.name as string;

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href={`/collections/${name}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {name}
          </Link>
          <div className="ml-auto">
            <Link
              href={`/collections/${name}/rules`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Curation Rules
            </Link>
          </div>
        </div>

        {/* Info banner: synonym sets are global */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <GitMerge className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
          <p>
            Synonym sets are global in Typesense v30+. Manage all sets from the{" "}
            <Link href="/synonyms" className="underline font-medium hover:text-blue-900">
              Synonyms page
            </Link>{" "}
            and link them to this collection via its schema settings.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <SynonymsList />
        </div>
      </div>
    </div>
  );
}
