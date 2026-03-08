import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const collection = await client.collections(name).retrieve();
    return NextResponse.json(collection);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const result = await client.collections(name).delete();
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
