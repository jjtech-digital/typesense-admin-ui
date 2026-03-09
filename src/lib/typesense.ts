import TypesenseClient from "typesense";
import { CONNECTION_CONFIG_COOKIE, getConnectionConfigFromCookies } from "@/lib/utils";

type Client = InstanceType<typeof TypesenseClient.Client>;

export function getTypesenseClientFromConfig(config: {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
}): Client {
  return new TypesenseClient.Client({
    nodes: [
      {
        host: config.host,
        port: config.port,
        protocol: config.protocol,
      },
    ],
    apiKey: config.apiKey,
    connectionTimeoutSeconds: 5,
  });
}

export function getConfigFromRequest(request: Request): {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
} | null {
  // 1st: explicit x-typesense-* headers
  const tsHost = request.headers.get("x-typesense-host");
  const tsPort = request.headers.get("x-typesense-port");
  const tsProtocol = request.headers.get("x-typesense-protocol");
  const tsApiKey = request.headers.get("x-typesense-api-key");

  if (tsHost && tsPort && tsProtocol && tsApiKey) {
    return {
      host: tsHost,
      port: parseInt(tsPort, 10),
      protocol: tsProtocol as "http" | "https",
      apiKey: tsApiKey,
    };
  }

  // 2nd: typesense_connection cookie from Cookie header
  const rawCookie = request.headers.get("cookie") ?? "";
  const match = rawCookie.match(
    new RegExp(`(?:^|;\\s*)${CONNECTION_CONFIG_COOKIE}=([^;]+)`)
  );
  if (match) {
    const config = getConnectionConfigFromCookies(decodeURIComponent(match[1]));
    if (config) return config;
  }

  return null;
}

export function getClientFromRequest(request: Request): Client {
  const config = getConfigFromRequest(request);
  if (!config) {
    throw new Error("No Typesense connection configured. Please log in first.");
  }
  return getTypesenseClientFromConfig(config);
}

/**
 * Make a direct REST call to the Typesense server.
 * Used for v30+ endpoints not yet in the typesense npm client (e.g. curation_sets).
 */
export async function typesenseFetch(
  request: Request,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<Response> {
  const config = getConfigFromRequest(request);
  if (!config) throw new Error("No Typesense connection configured. Please log in first.");

  const isDefault =
    (config.protocol === "https" && config.port === 443) ||
    (config.protocol === "http" && config.port === 80);
  const baseUrl = `${config.protocol}://${config.host}${isDefault ? "" : `:${config.port}`}`;

  const headers: Record<string, string> = { "X-TYPESENSE-API-KEY": config.apiKey };
  if (options.body) headers["Content-Type"] = "application/json";

  return fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

export function formatApiError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof Error) {
    const httpError = error as Error & {
      httpStatus?: number;
      message: string;
    };
    if (httpError.httpStatus) {
      return {
        message: httpError.message,
        status: httpError.httpStatus,
      };
    }
    return {
      message: error.message,
      status: 500,
    };
  }
  return {
    message: "An unknown error occurred",
    status: 500,
  };
}
