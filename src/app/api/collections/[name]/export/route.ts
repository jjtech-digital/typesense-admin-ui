import { NextRequest, NextResponse } from "next/server";
import { typesenseFetch, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const res = await typesenseFetch(
      request,
      `/collections/${encodeURIComponent(name)}/documents/export`
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Failed to export documents" },
        { status: res.status }
      );
    }
    const text = await res.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/x-jsonlines",
        "Content-Disposition": `attachment; filename="${name}-documents.jsonl"`,
      },
    });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
