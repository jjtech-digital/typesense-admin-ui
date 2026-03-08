import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, formatApiError } from "@/lib/typesense";

export async function GET(request: NextRequest) {
  try {
    const client = getClientFromRequest(request);
    const health = await client.health.retrieve();
    return NextResponse.json(health);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message, ok: false }, { status });
  }
}
