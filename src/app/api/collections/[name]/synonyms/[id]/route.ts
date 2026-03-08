import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, getConfigFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string; id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const client = getClientFromRequest(request);
    const synonym = await client.collections(name).synonyms(id).retrieve();
    return NextResponse.json(synonym);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const body = await request.json();

    if (!body.synonyms || body.synonyms.length === 0) {
      return NextResponse.json({ error: "Synonyms are required" }, { status: 400 });
    }

    const cfg = getConfigFromRequest(request);
    if (!cfg) return NextResponse.json({ error: "No Typesense connection configured" }, { status: 401 });
    const tsUrl = `${cfg.protocol}://${cfg.host}:${cfg.port}/collections/${encodeURIComponent(name)}/synonyms/${encodeURIComponent(id)}`;

    const tsRes = await fetch(tsUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": cfg.apiKey,
      },
      body: JSON.stringify(body),
    });

    const tsData = await tsRes.json();

    if (!tsRes.ok) {
      const msg = tsData?.message || `Typesense error (${tsRes.status})`;
      return NextResponse.json(
        { error: msg, status: tsRes.status },
        { status: tsRes.status }
      );
    }

    return NextResponse.json(tsData);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, id } = await params;
    const client = getClientFromRequest(request);
    const result = await client.collections(name).synonyms(id).delete();
    return NextResponse.json(result);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
