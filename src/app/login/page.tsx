"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Zap, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const COOKIE_NAME = "typesense_connection";

function saveConnectionCookie(config: {
  host: string;
  port: number;
  protocol: "http" | "https";
  apiKey: string;
}) {
  const value = encodeURIComponent(JSON.stringify(config));
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "idle";

  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("8108");
  const [protocol, setProtocol] = useState<"http" | "https">("http");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const [status, setStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [errors, setErrors] = useState<{ host?: string; apiKey?: string; port?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!host.trim()) e.host = "Host is required";
    if (!apiKey.trim()) e.apiKey = "API key is required";
    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535)
      e.port = "Enter a valid port (1–65535)";
    return e;
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("connecting");

    try {
      const res = await fetch("/api/health", {
        headers: {
          "x-typesense-host": host.trim(),
          "x-typesense-port": port,
          "x-typesense-protocol": protocol,
          "x-typesense-api-key": apiKey.trim(),
        },
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setStatus("success");
        saveConnectionCookie({
          host: host.trim(),
          port: parseInt(port, 10),
          protocol,
          apiKey: apiKey.trim(),
        });
        // Brief success flash, then redirect
        setTimeout(() => router.push("/"), 600);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Could not connect. Check your credentials.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — could not reach the server.");
    }
  };

  const isConnecting = status === "connecting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Typesense Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Connect to your Typesense server</p>
        </div>

        {/* Session expired notice */}
        {sessionExpired && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 text-amber-300 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>Your session expired after 1 hour of inactivity. Please reconnect.</span>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleConnect} noValidate className="space-y-5">
            {/* Protocol + Host row */}
            <div className="flex gap-3">
              {/* Protocol selector */}
              <div className="w-28 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as "http" | "https")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                    hover:border-gray-400 transition-colors"
                >
                  <option value="http">http</option>
                  <option value="https">https</option>
                </select>
              </div>

              {/* Host */}
              <div className="flex-1">
                <Input
                  label="Host"
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setErrors((prev) => ({ ...prev, host: undefined }));
                  }}
                  placeholder="localhost"
                  error={errors.host}
                  required
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            {/* Port */}
            <Input
              label="Port"
              value={port}
              onChange={(e) => {
                setPort(e.target.value);
                setErrors((prev) => ({ ...prev, port: undefined }));
              }}
              placeholder="8108"
              type="number"
              min="1"
              max="65535"
              error={errors.port}
            />

            {/* API Key */}
            <Input
              label="API Key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setErrors((prev) => ({ ...prev, apiKey: undefined }));
              }}
              placeholder="Enter your Typesense admin API key"
              type={showApiKey ? "text" : "password"}
              error={errors.apiKey}
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Status message */}
            {status === "error" && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>Connected! Redirecting to dashboard…</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </form>

          {/* Defaults hint */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Default values</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs text-gray-500">
              <div className="bg-gray-50 rounded px-3 py-1.5">
                <span className="text-gray-400">HOST</span>
                <span className="float-right text-gray-700">localhost</span>
              </div>
              <div className="bg-gray-50 rounded px-3 py-1.5">
                <span className="text-gray-400">PORT</span>
                <span className="float-right text-gray-700">8108</span>
              </div>
              <div className="bg-gray-50 rounded px-3 py-1.5">
                <span className="text-gray-400">PROTOCOL</span>
                <span className="float-right text-gray-700">http</span>
              </div>
              <div className="bg-gray-50 rounded px-3 py-1.5">
                <span className="text-gray-400">API KEY</span>
                <span className="float-right text-gray-700">••••••••</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Credentials are stored in your browser and never sent to a third party.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
