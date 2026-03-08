import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const overrides = await client.collections(name).overrides().retrieve();
    return NextResponse.json(overrides);
  } catch (error) {
    const { message, status } = formatApiError(error);
    // Typesense returns 404 when no overrides exist — treat as empty list.
    if (status === 404) {
      return NextResponse.json({ overrides: [] });
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const body = await request.json();
    const { id, ...overrideData } = body;

    if (!overrideData.rule || !overrideData.rule.query) {
      return NextResponse.json(
        { error: "Override rule with query is required" },
        { status: 400 }
      );
    }

    const override = await client
      .collections(name)
      .overrides()
      .upsert(id || `override-${Date.now()}`, overrideData);

    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
