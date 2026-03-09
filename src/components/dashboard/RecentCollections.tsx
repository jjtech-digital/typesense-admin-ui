import Link from "next/link";
import { Database, ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { TypesenseCollection } from "@/types/typesense";

interface RecentCollectionsProps {
  collections: TypesenseCollection[];
}

export function RecentCollections({ collections }: RecentCollectionsProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">
          Recent Collections
        </h3>
        <Link
          href="/collections"
          className="text-sm text-brand hover:text-brand-hover flex items-center gap-1"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <Database className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No collections yet</p>
          <Link
            href="/collections"
            className="mt-2 text-sm text-brand hover:underline"
          >
            Create your first collection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.slice(0, 6).map((collection) => (
            <Link
              key={collection.name}
              href={`/collections/${collection.name}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Database className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 group-hover:text-brand truncate">
                  {collection.name}
                </p>
                <p className="text-xs text-gray-500">
                  {collection.fields.length} fields
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatNumber(collection.num_documents)}
                </p>
                <p className="text-xs text-gray-500">docs</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand opacity-0 group-hover:opacity-100 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
