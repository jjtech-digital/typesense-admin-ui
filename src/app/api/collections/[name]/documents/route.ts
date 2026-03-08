import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q") || "*";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "25", 10);
    const filterBy = searchParams.get("filter_by") || "";
    const sortBy = searchParams.get("sort_by") || "";

    const collection = await client.collections(name).retrieve();
    const queryByFields = (collection.fields || [])
      .filter((f: { type: string }) => f.type === "string" || f.type === "string[]")
      .map((f: { name: string }) => f.name)
      .slice(0, 5)
      .join(",");

    const facetBy = searchParams.get("facet_by") || "";
    const maxFacetValues = parseInt(searchParams.get("max_facet_values") || "20", 10);

    const searchOptions: Record<string, string | number | boolean> = {
      q,
      query_by: queryByFields || ".*",
      page,
      per_page: perPage,
    };

    if (filterBy) searchOptions.filter_by = filterBy;
    if (sortBy) searchOptions.sort_by = sortBy;
    if (facetBy) {
      searchOptions.facet_by = facetBy;
      searchOptions.max_facet_values = maxFacetValues;
    }

    const results = await client.collections(name).documents().search(searchOptions);
    return NextResponse.json(results);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
