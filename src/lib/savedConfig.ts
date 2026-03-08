/**
 * Client-side only — nothing here is ever sent to the server.
 * Stores the Typesense connection config in localStorage with a
 * 30-day sliding expiry. Each read extends the window by 30 days.
 */

const STORAGE_KEY = "typesense_saved_config";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface SavedConfig {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
  savedAt: number;   // ms timestamp of first save
  expiresAt: number; // ms timestamp — sliding 30-day window
}

/** Read saved config. Returns null if missing or expired. Slides the window on each read. */
export function getSavedConfig(): SavedConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedConfig = JSON.parse(raw);
    if (!parsed.host || !parsed.apiKey || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Slide the 30-day window on every access
    parsed.expiresAt = Date.now() + THIRTY_DAYS_MS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return null;
  }
}

/** Persist config to localStorage with a fresh 30-day window. */
export function persistConfig(config: {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
}): void {
  if (typeof window === "undefined") return;
  const existing = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  })();
  const entry: SavedConfig = {
    ...config,
    savedAt: existing?.savedAt ?? Date.now(),
    expiresAt: Date.now() + THIRTY_DAYS_MS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

/** Remove saved config entirely (user explicitly clears remembered credentials). */
export function clearSavedConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Human-readable time since the config was first saved. */
export function timeSinceSaved(savedAt: number): string {
  const diffMs = Date.now() - savedAt;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
