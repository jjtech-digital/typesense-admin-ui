"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CONNECTION_CONFIG_COOKIE, getConnectionConfigFromCookies } from "@/lib/utils";
import { persistConfig, clearSavedConfig } from "@/lib/savedConfig";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function clearConnectionCookie() {
  document.cookie = `${CONNECTION_CONFIG_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function useConnectionConfig() {
  const router = useRouter();

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

  // Returns the Typesense base URL, omitting the port when it is the
  // protocol default (443 for https, 80 for http).
  const getBaseUrl = useCallback((): string | null => {
    const config = getConfig();
    if (!config) return null;
    const isDefaultPort =
      (config.protocol === "https" && config.port === 443) ||
      (config.protocol === "http" && config.port === 80);
    const portPart = isDefaultPort ? "" : `:${config.port}`;
    return `${config.protocol}://${config.host}${portPart}`;
  }, [getConfig]);

  const saveConfig = useCallback(
    (config: {
      host: string;
      port: number;
      protocol: "http" | "https";
      apiKey: string;
    }) => {
      // 1. Save to session cookie (active session)
      const value = encodeURIComponent(JSON.stringify(config));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CONNECTION_CONFIG_COOKIE}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${secure}`;

      // 2. Persist to localStorage with 30-day sliding window (client-only, never sent to server)
      persistConfig(config);
    },
    []
  );

  /**
   * Logout: clears the active session cookie but intentionally keeps
   * the localStorage saved config so the login form can be pre-filled
   * on the next visit (30-day sliding window).
   */
  const logout = useCallback(
    (reason?: "idle" | "manual") => {
      clearConnectionCookie();
      const query = reason ? `?reason=${reason}` : "";
      router.push(`/login${query}`);
    },
    [router]
  );

  /**
   * Full clear: removes both the session cookie AND the localStorage
   * saved config. Use when the user explicitly wants to forget credentials.
   */
  const clearConfig = useCallback(() => {
    clearConnectionCookie();
    clearSavedConfig();
  }, []);

  return { getConfig, getHeaders, getBaseUrl, saveConfig, logout, clearConfig };
}
