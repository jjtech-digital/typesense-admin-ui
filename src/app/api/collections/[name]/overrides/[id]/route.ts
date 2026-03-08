import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string; id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const client = getClientFromRequest(request);
    const override = await client.collections(name).overrides(id).retrieve();
    return NextResponse.json(override);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const client = getClientFromRequest(request);
    const body = await request.json();

    if (!body.rule || !body.rule.query) {
      return NextResponse.json(
        { error: "Override rule with query is required" },
        { status: 400 }
      );
    }

    const override = await client.collections(name).overrides().upsert(id, body);
    return NextResponse.json(override);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const client = getClientFromRequest(request);
    const result = await client.collections(name).overrides(id).delete();
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
