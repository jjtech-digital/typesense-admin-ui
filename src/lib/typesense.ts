import TypesenseClient from "typesense";
import type { ConfigurationOptions } from "typesense/lib/Typesense/Configuration";
import { CONNECTION_CONFIG_COOKIE, getConnectionConfigFromCookies } from "@/lib/utils";

type Client = InstanceType<typeof TypesenseClient.Client>;

function getTypesenseConfig(): ConfigurationOptions {
  const host = process.env.TYPESENSE_HOST || "localhost";
  const port = parseInt(process.env.TYPESENSE_PORT || "8108", 10);
  const protocol = (process.env.TYPESENSE_PROTOCOL || "http") as
    | "http"
    | "https";
  const apiKey = process.env.TYPESENSE_API_KEY || "xyz";
  const connectionTimeoutSeconds = parseInt(
    process.env.TYPESENSE_CONNECTION_TIMEOUT_SECONDS || "5",
    10
  );

  return {
    nodes: [
      {
        host,
        port,
        protocol,
      },
    ],
    apiKey,
    connectionTimeoutSeconds,
  };
}

export function getTypesenseClient(): Client {
  return new TypesenseClient.Client(getTypesenseConfig());
}

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
} {
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

  // Fallback: env vars
  return {
    host: process.env.TYPESENSE_HOST || "localhost",
    port: parseInt(process.env.TYPESENSE_PORT || "8108", 10),
    protocol: (process.env.TYPESENSE_PROTOCOL || "http") as "http" | "https",
    apiKey: process.env.TYPESENSE_API_KEY || "xyz",
  };
}

export function getClientFromRequest(request: Request): Client {
  return getTypesenseClientFromConfig(getConfigFromRequest(request));
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
