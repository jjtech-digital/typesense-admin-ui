import { NextRequest, NextResponse } from "next/server";
import { typesenseFetch, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * Typesense v30+ uses global /curation_sets instead of per-collection /overrides.
 * Each collection has a curation_sets[] array linking set names.
 * We use a default set named "curation-{collectionName}" per collection.
 */
function defaultSetName(collectionName: string): string {
  return `curation-${collectionName}`;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    // Get linked curation set names from the collection
    const colRes = await typesenseFetch(request, `/collections/${encodeURIComponent(name)}`);
    if (!colRes.ok) {
      const data = await colRes.json();
      return NextResponse.json({ error: data.message || "Failed to fetch collection" }, { status: colRes.status });
    }
    const collection = await colRes.json();
    const setNames: string[] = collection.curation_sets || [];

    // Fetch all linked curation sets and aggregate items
    const overrides: unknown[] = [];
    for (const setName of setNames) {
      const setRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(setName)}`);
      if (setRes.ok) {
        const set = await setRes.json();
        for (const item of set.items || []) {
          overrides.push({ ...item, _curation_set: setName });
        }
      }
    }

    return NextResponse.json({ overrides });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { id, ...overrideData } = body;

    if (!overrideData.rule || !overrideData.rule.query) {
      return NextResponse.json(
        { error: "Curation rule with query is required" },
        { status: 400 }
      );
    }

    const ruleId = id || `rule-${Date.now()}`;
    const setName = defaultSetName(name);

    // Fetch existing set (or start empty)
    const existingRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(setName)}`);
    let existingItems: unknown[] = [];
    if (existingRes.ok) {
      const existing = await existingRes.json();
      existingItems = existing.items || [];
    }

    // Add the new item
    const newItem = { id: ruleId, ...overrideData };
    existingItems.push(newItem);

    // Upsert the curation set
    const upsertRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(setName)}`, {
      method: "PUT",
      body: { items: existingItems },
    });
    const upsertData = await upsertRes.json();
    if (!upsertRes.ok) {
      return NextResponse.json({ error: upsertData.message || "Failed to create rule" }, { status: upsertRes.status });
    }

    // Ensure the set is linked to the collection
    const colRes = await typesenseFetch(request, `/collections/${encodeURIComponent(name)}`);
    if (colRes.ok) {
      const col = await colRes.json();
      const linked: string[] = col.curation_sets || [];
      if (!linked.includes(setName)) {
        await typesenseFetch(request, `/collections/${encodeURIComponent(name)}`, {
          method: "PATCH",
          body: { curation_sets: [...linked, setName] },
        });
      }
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
