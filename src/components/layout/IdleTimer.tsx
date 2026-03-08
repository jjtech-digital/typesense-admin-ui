"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { CONNECTION_CONFIG_COOKIE } from "@/lib/utils";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;       // 1 hour
const WARNING_BEFORE_MS = 5 * 60 * 1000;       // warn 5 min before timeout
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS; // 55 min

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

function clearConnectionCookie() {
  document.cookie = `${CONNECTION_CONFIG_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function IdleTimer() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const logout = useCallback(() => {
    clearAllTimers();
    clearConnectionCookie();
    router.push("/login?reason=idle");
  }, [router]);

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARNING_BEFORE_MS / 1000);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();

      idleTimerRef.current = setTimeout(() => {
        logout();
      }, WARNING_BEFORE_MS);
    }, WARNING_AT_MS);
  }, [logout, startCountdown]);

  // Attach activity listeners
  useEffect(() => {
    const handleActivity = () => {
      if (!showWarning) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, handleActivity, { passive: true })
    );

    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, handleActivity)
      );
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    resetTimers();
  };

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Session Expiring Soon
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              You&apos;ve been inactive. Your session will expire in:
            </p>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-6 py-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <span className="text-2xl font-mono font-bold text-amber-700">
              {timeStr}
            </span>
          </div>

          <p className="text-xs text-gray-400">
            You will be redirected to the login page to re-enter your
            connection details.
          </p>

          <div className="flex gap-3 w-full mt-1">
            <button
              onClick={logout}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Log out now
            </button>
            <button
              onClick={handleStayLoggedIn}
              className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Stay logged in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
