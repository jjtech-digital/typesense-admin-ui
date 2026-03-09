import { NextRequest, NextResponse } from "next/server";
import { typesenseFetch, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string; id: string }>;
}

interface CurationItem {
  id: string;
  [key: string]: unknown;
}

/** Find the curation set and item for a given collection + item id */
async function findItem(
  request: NextRequest,
  collectionName: string,
  itemId: string
): Promise<{ setName: string; items: CurationItem[]; item: CurationItem } | null> {
  const colRes = await typesenseFetch(request, `/collections/${encodeURIComponent(collectionName)}`);
  if (!colRes.ok) return null;
  const col = await colRes.json();
  const setNames: string[] = col.curation_sets || [];

  for (const setName of setNames) {
    const setRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(setName)}`);
    if (!setRes.ok) continue;
    const set = await setRes.json();
    const items: CurationItem[] = set.items || [];
    const item = items.find((i) => i.id === itemId);
    if (item) return { setName, items, item };
  }
  return null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const found = await findItem(request, name, id);
    if (!found) {
      return NextResponse.json({ error: "Curation rule not found" }, { status: 404 });
    }
    return NextResponse.json(found.item);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const body = await request.json();

    if (!body.rule || !body.rule.query) {
      return NextResponse.json(
        { error: "Curation rule with query is required" },
        { status: 400 }
      );
    }

    const found = await findItem(request, name, id);
    if (!found) {
      return NextResponse.json({ error: "Curation rule not found" }, { status: 404 });
    }

    // Replace the item in the set
    const updatedItems = found.items.map((item) =>
      item.id === id ? { id, ...body } : item
    );

    const upsertRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(found.setName)}`, {
      method: "PUT",
      body: { items: updatedItems },
    });
    const upsertData = await upsertRes.json();
    if (!upsertRes.ok) {
      return NextResponse.json({ error: upsertData.message || "Failed to update rule" }, { status: upsertRes.status });
    }

    return NextResponse.json({ id, ...body });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const found = await findItem(request, name, id);
    if (!found) {
      return NextResponse.json({ error: "Curation rule not found" }, { status: 404 });
    }

    // Remove the item from the set
    const updatedItems = found.items.filter((item) => item.id !== id);

    const upsertRes = await typesenseFetch(request, `/curation_sets/${encodeURIComponent(found.setName)}`, {
      method: "PUT",
      body: { items: updatedItems },
    });
    if (!upsertRes.ok) {
      const data = await upsertRes.json();
      return NextResponse.json({ error: data.message || "Failed to delete rule" }, { status: upsertRes.status });
    }

    return NextResponse.json({ id });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
