"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CurationRuleEditor } from "@/components/overrides/CurationRuleEditor";

export default function NewCurationRulePage() {
  const params = useParams();
  const name = params.name as string;

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6">
        <CurationRuleEditor collectionName={name} />
      </div>
    </div>
  );
}
