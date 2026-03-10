import { NextRequest, NextResponse } from "next/server";
import { typesenseFetch, formatApiError } from "@/lib/typesense";

export async function GET(request: NextRequest) {
  try {
    const res = await typesenseFetch(request, "/metrics.json");
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Failed to fetch metrics" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
