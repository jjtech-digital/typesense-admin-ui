"use client";

import { useCallback } from "react";
import { CONNECTION_CONFIG_COOKIE, getConnectionConfigFromCookies } from "@/lib/utils";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

export function useConnectionConfig() {
  const getConfig = useCallback(() => {
    const cookieStr = getCookieValue(CONNECTION_CONFIG_COOKIE);
    return getConnectionConfigFromCookies(cookieStr);
  }, []);

  const getHeaders = useCallback((): Record<string, string> => {
    const config = getConfig();
    if (!config) return {};

    return {
      "x-typesense-host": config.host,
      "x-typesense-port": config.port.toString(),
      "x-typesense-protocol": config.protocol,
      "x-typesense-api-key": config.apiKey,
    };
  }, [getConfig]);

  const saveConfig = useCallback(
    (config: {
      host: string;
      port: number;
      protocol: "http" | "https";
      apiKey: string;
    }) => {
      const value = encodeURIComponent(JSON.stringify(config));
      // Set cookie with 1 year expiry
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${CONNECTION_CONFIG_COOKIE}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    },
    []
  );

  const clearConfig = useCallback(() => {
    document.cookie = `${CONNECTION_CONFIG_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }, []);

  return { getConfig, getHeaders, saveConfig, clearConfig };
}
