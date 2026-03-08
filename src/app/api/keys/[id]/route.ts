import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getClientFromRequest(request);
    const key = await client.keys(parseInt(id, 10)).retrieve();
    return NextResponse.json(key);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getClientFromRequest(request);
    const result = await client.keys(parseInt(id, 10)).delete();
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
