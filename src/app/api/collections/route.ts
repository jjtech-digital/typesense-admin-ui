import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";
import type { TypesenseCollectionCreate } from "@/types/typesense";

export async function GET(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    const collections = await client.collections().retrieve();
    return NextResponse.json(collections);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    const body: TypesenseCollectionCreate = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    if (!body.fields || body.fields.length === 0) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collection = await client.collections().create(body as any);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
