import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";
import type { TypesenseApiKeyCreate } from "@/types/typesense";

export async function GET(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    const keys = await client.keys().retrieve();
    return NextResponse.json(keys);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    const body: TypesenseApiKeyCreate = await request.json();

    if (!body.description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!body.actions || body.actions.length === 0) {
      return NextResponse.json(
        { error: "At least one action is required" },
        { status: 400 }
      );
    }

    if (!body.collections || body.collections.length === 0) {
      return NextResponse.json(
        { error: "At least one collection scope is required" },
        { status: 400 }
      );
    }

    const key = await client.keys().create(body);
    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
