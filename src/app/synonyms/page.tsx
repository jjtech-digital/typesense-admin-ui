"use client";

import React from "react";
import { GitMerge } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SynonymsList } from "@/components/synonyms/SynonymsList";

export default function SynonymsPage() {
  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <GitMerge className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Synonym Sets</h1>
            <p className="text-sm text-gray-500">
              Global synonym sets — link them to collections via collection settings
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <SynonymsList />
        </div>
      </div>
    </div>
  );
}
