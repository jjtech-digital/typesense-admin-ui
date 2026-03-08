import { NextRequest, NextResponse } from "next/server";
import { getClientFromRequest, getConfigFromRequest, formatApiError } from "@/lib/typesense";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const client = getClientFromRequest(request);
    const synonyms = await client.collections(name).synonyms().retrieve();
    return NextResponse.json(synonyms);
  } catch (error) {
    const { message, status } = formatApiError(error);
    // Typesense returns 404 when no synonyms exist — treat as empty list.
    if (status === 404) {
      return NextResponse.json({ synonyms: [] });
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { id, ...synonymData } = body;

    if (!synonymData.synonyms || synonymData.synonyms.length === 0) {
      return NextResponse.json({ error: "Synonyms are required" }, { status: 400 });
    }

    const synonymId = id || `synonym-${Date.now()}`;

    // Use direct fetch to Typesense REST API instead of the SDK.
    // This bypasses SDK node-selection / retry logic and gives us
    // the raw response body for better error diagnosis.
    const cfg = getConfigFromRequest(request);
    const tsUrl = `${cfg.protocol}://${cfg.host}:${cfg.port}/collections/${encodeURIComponent(name)}/synonyms/${encodeURIComponent(synonymId)}`;

    const tsRes = await fetch(tsUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": cfg.apiKey,
      },
      body: JSON.stringify(synonymData),
    });

    const tsData = await tsRes.json();

    if (!tsRes.ok) {
      const msg = tsData?.message || `Typesense error (${tsRes.status})`;
      return NextResponse.json(
        { error: msg, status: tsRes.status, url: tsUrl.replace(cfg.apiKey, "***") },
        { status: tsRes.status }
      );
    }

    return NextResponse.json(tsData, { status: 201 });
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
