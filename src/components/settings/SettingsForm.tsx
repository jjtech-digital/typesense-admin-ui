"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Server,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";

interface ServerEnv {
  host: string | null;
  port: string | null;
  protocol: string | null;
  hasApiKey: boolean;
}

interface Props {
  serverEnv: ServerEnv;
}

export function SettingsForm({ serverEnv }: Props) {
  const { getConfig, saveConfig, clearConfig } = useConnectionConfig();

  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("8108");
  const [protocol, setProtocol] = useState<"http" | "https">("http");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const config = getConfig();
    if (config) {
      setHost(config.host);
      setPort(config.port.toString());
      setProtocol(config.protocol);
      setApiKey(config.apiKey);
    }
  }, [getConfig]);

  const handleSave = () => {
    if (!host.trim() || !apiKey.trim()) {
      error("Host and API key are required");
      return;
    }

    saveConfig({
      host: host.trim(),
      port: parseInt(port, 10) || 8108,
      protocol,
      apiKey: apiKey.trim(),
    });

    setSaved(true);
    success("Connection settings saved");
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestMessage("");

    try {
      const headers: Record<string, string> = {
        "x-typesense-host": host.trim(),
        "x-typesense-port": port,
        "x-typesense-protocol": protocol,
        "x-typesense-api-key": apiKey.trim(),
      };

      const res = await fetch("/api/health", { headers });
      const data = await res.json();

      if (data.ok) {
        setTestStatus("success");
        setTestMessage("Successfully connected to Typesense!");
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Server returned unhealthy status");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(
        err instanceof Error ? err.message : "Failed to connect to Typesense"
      );
    }
  };

  const handleReset = () => {
    // clearConfig removes both the session cookie AND the localStorage saved config
    clearConfig();
    setHost("localhost");
    setPort("8108");
    setProtocol("http");
    setApiKey("");
    setTestStatus("idle");
    success("Settings cleared — saved credentials removed from this browser");
  };

  const testStatusColors = {
    idle: "text-gray-500",
    testing: "text-blue-500",
    success: "text-green-600",
    error: "text-red-600",
  };

  const envRows: { label: string; value: string | null; fallback: string }[] = [
    { label: "TYPESENSE_HOST", value: serverEnv.host, fallback: "localhost" },
    { label: "TYPESENSE_PORT", value: serverEnv.port, fallback: "8108" },
    { label: "TYPESENSE_PROTOCOL", value: serverEnv.protocol, fallback: "http" },
    {
      label: "TYPESENSE_API_KEY",
      value: serverEnv.hasApiKey ? "••••••••" : null,
      fallback: "(not set)",
    },
  ];

  return (
    <div>
      <Header />
      <div className="p-4 sm:p-6 max-w-2xl space-y-4 sm:space-y-6">
        {/* Connection Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Typesense Connection
              </h2>
              <p className="text-sm text-gray-500">
                Configure your Typesense server connection
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  required
                  helperText="IP address or hostname of your Typesense server"
                />
              </div>
              <Input
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8108"
                type="number"
                min="1"
                max="65535"
              />
            </div>

            <Select
              label="Protocol"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as "http" | "https")}
              options={[
                { value: "http", label: "HTTP" },
                { value: "https", label: "HTTPS" },
              ]}
            />

            <div className="relative">
              <Input
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Typesense API key"
                type={showApiKey ? "text" : "password"}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                helperText="Your Typesense master or admin API key"
              />
            </div>
          </div>

          {/* Connection test result */}
          {testStatus !== "idle" && (
            <div
              className={`mt-4 flex items-center gap-2 text-sm ${testStatusColors[testStatus]}`}
            >
              {testStatus === "testing" && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              {testStatus === "success" && (
                <CheckCircle className="h-4 w-4" />
              )}
              {testStatus === "error" && <XCircle className="h-4 w-4" />}
              <span>
                {testStatus === "testing" ? "Testing connection..." : testMessage}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <Button
              variant="outline"
              onClick={handleTest}
              loading={testStatus === "testing"}
            >
              <RefreshCw className="h-4 w-4" />
              Test Connection
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : "Save Settings"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleReset}
              className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Server-side env info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Server-Side Configuration
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            For production deployments, configure via environment variables in{" "}
            <code className="bg-blue-100 px-1 rounded font-mono text-xs">
              .env.local
            </code>
            :
          </p>
          <div className="bg-blue-900 rounded-lg p-4 font-mono text-xs text-blue-100 space-y-1">
            <p>TYPESENSE_HOST=localhost</p>
            <p>TYPESENSE_PORT=8108</p>
            <p>TYPESENSE_PROTOCOL=http</p>
            <p>TYPESENSE_API_KEY=your-api-key-here</p>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Settings saved in this UI override environment variables via a
            browser cookie.
          </p>
        </div>

        {/* Current env config — values come from the server */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">
              Current Environment Configuration
            </h3>
          </div>
          <div className="space-y-2 text-sm overflow-x-auto">
            {envRows.map(({ label, value, fallback }) => (
              <div key={label} className="flex items-center gap-3">
                <code className="font-mono text-xs text-gray-500 w-48 shrink-0">
                  {label}
                </code>
                <span className="text-gray-400">→</span>
                {value !== null ? (
                  <span className="font-mono text-xs text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                    {value}
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-dashed border-gray-200">
                      {fallback}
                    </span>
                    <span className="text-xs text-gray-400">(default)</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Copy{" "}
            <code className="bg-gray-50 px-1 rounded">.env.local.example</code>{" "}
            to <code className="bg-gray-50 px-1 rounded">.env.local</code> and
            set your values.
          </p>
        </div>
      </div>
    </div>
  );
}
