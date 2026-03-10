import { NextRequest, NextResponse } from "next/server";
import { typesenseFetch, formatApiError } from "@/lib/typesense";

export async function GET(request: NextRequest) {
  try {
    const res = await typesenseFetch(request, "/analytics/rules");
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Failed to fetch analytics rules" },
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

/**
 * Schema for auto-created destination collections by rule type.
 */
function getDestinationSchema(collectionName: string, ruleType: string) {
  if (ruleType === "popular_queries" || ruleType === "nohits_queries") {
    return {
      name: collectionName,
      fields: [
        { name: "q", type: "string" },
        { name: "count", type: "int32" },
      ],
    };
  }
  // log type — generic key/value store
  return {
    name: collectionName,
    fields: [
      { name: "q", type: "string" },
      { name: "count", type: "int32" },
    ],
  };
}

async function createDestinationCollection(
  request: NextRequest,
  collectionName: string,
  ruleType: string
): Promise<{ ok: boolean; error?: string }> {
  const schema = getDestinationSchema(collectionName, ruleType);
  const res = await typesenseFetch(request, "/collections", {
    method: "POST",
    body: schema,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg: string;
    try {
      msg = JSON.parse(text).message || text;
    } catch {
      msg = text;
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // First attempt
    let res = await typesenseFetch(request, "/analytics/rules", {
      method: "POST",
      body,
    });

    let text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }

    // If destination collection doesn't exist, create it and retry
    if (
      !res.ok &&
      typeof (data.message || data.error) === "string" &&
      (data.message || data.error || "").toString().toLowerCase().includes("destination collection does not exist")
    ) {
      const destCollection =
        (body.params?.destination_collection as string) ||
        (body.params?.destination?.collection as string);

      if (!destCollection) {
        return NextResponse.json(
          { error: "Destination collection does not exist and no destination_collection specified" },
          { status: 400 }
        );
      }

      // Auto-create the destination collection (skip for counter type — it uses the source collection)
      const ruleType = body.type || "popular_queries";
      if (ruleType === "counter") {
        return NextResponse.json(
          { error: "Counter rules use the source collection as destination. The counter_field must already exist in that collection." },
          { status: 400 }
        );
      }

      const createResult = await createDestinationCollection(request, destCollection, ruleType);
      if (!createResult.ok) {
        return NextResponse.json(
          { error: `Auto-created destination collection failed: ${createResult.error}` },
          { status: 400 }
        );
      }

      // Retry rule creation
      res = await typesenseFetch(request, "/analytics/rules", {
        method: "POST",
        body,
      });

      text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: (data.message || data.error || "Failed to create analytics rule") as string },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const { message, status } = formatApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
