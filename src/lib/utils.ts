import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

export function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••";
  return `${key.substring(0, 4)}${"•".repeat(key.length - 8)}${key.substring(key.length - 4)}`;
}

export function getFieldTypeColor(type: string): string {
  const colors: Record<string, string> = {
    string: "bg-blue-100 text-blue-800",
    "string[]": "bg-blue-100 text-blue-800",
    int32: "bg-green-100 text-green-800",
    int64: "bg-green-100 text-green-800",
    "int32[]": "bg-green-100 text-green-800",
    "int64[]": "bg-green-100 text-green-800",
    float: "bg-yellow-100 text-yellow-800",
    "float[]": "bg-yellow-100 text-yellow-800",
    bool: "bg-purple-100 text-purple-800",
    "bool[]": "bg-purple-100 text-purple-800",
    geopoint: "bg-red-100 text-red-800",
    auto: "bg-gray-100 text-gray-800",
    object: "bg-orange-100 text-orange-800",
    "object[]": "bg-orange-100 text-orange-800",
    image: "bg-pink-100 text-pink-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function parseJsonSafely<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export const CONNECTION_CONFIG_COOKIE = "typesense_connection";

export function getConnectionConfigFromCookies(cookieStr: string | null): {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
} | null {
  if (!cookieStr) return null;
  try {
    const parsed = JSON.parse(cookieStr);
    if (parsed.host && parsed.port && parsed.protocol && parsed.apiKey) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
