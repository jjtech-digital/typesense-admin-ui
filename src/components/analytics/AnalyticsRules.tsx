"use client";

import { useState } from "react";
import {
  BarChart3,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  X,
} from "lucide-react";
import { useConnectionConfig } from "@/hooks/useConnectionConfig";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

// Typesense v30 analytics rule shape
interface AnalyticsRule {
  name: string;
  type: string;
  collection?: string;
  event_type?: string;
  rule_tag?: string;
  params: Record<string, unknown>;
}

interface AnalyticsRulesProps {
  rules: AnalyticsRule[];
  loading: boolean;
  onRefresh: () => void;
}

const ruleTypes = [
  { value: "popular_queries", label: "Popular Queries" },
  { value: "nohits_queries", label: "No Results Queries" },
  { value: "counter", label: "Counter" },
  { value: "log", label: "Log" },
];

const eventTypes = [
  { value: "search", label: "Search" },
  { value: "click", label: "Click" },
  { value: "conversion", label: "Conversion" },
  { value: "visit", label: "Visit" },
];

export function AnalyticsRules({ rules, loading, onRefresh }: AnalyticsRulesProps) {
  const { getHeaders } = useConnectionConfig();
  const { success, error: showError } = useToast();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state (v30 format)
  const [newRule, setNewRule] = useState({
    name: "",
    type: "popular_queries",
    collection: "",
    eventType: "search",
    destinationCollection: "",
    limit: 1000,
    counterField: "",
    weight: 1,
  });
  const [creating, setCreating] = useState(false);

  const handleDelete = async (name: string) => {
    if (deleting) return;
    setDeleting(name);
    try {
      const res = await fetch(`/api/analytics/rules/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rule");
      }
      success(`Rule "${name}" deleted`);
      onRefresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setDeleting(null);
    }
  };

  const handleCreate = async () => {
    if (!newRule.name.trim() || !newRule.collection.trim() || !newRule.destinationCollection.trim()) {
      showError("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      // Build v30 payload
      const body: Record<string, unknown> = {
        name: newRule.name.trim(),
        type: newRule.type,
        collection: newRule.collection.trim(),
        event_type: newRule.eventType,
        params: {
          destination_collection: newRule.destinationCollection.trim(),
          limit: newRule.limit,
        },
      };

      // Counter-specific fields
      if (newRule.type === "counter") {
        (body.params as Record<string, unknown>).counter_field = newRule.counterField.trim();
        (body.params as Record<string, unknown>).weight = newRule.weight;
      }

      const res = await fetch("/api/analytics/rules", {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rule");
      }
      success(`Rule "${newRule.name}" created`);
      setShowCreateModal(false);
      setNewRule({
        name: "",
        type: "popular_queries",
        collection: "",
        eventType: "search",
        destinationCollection: "",
        limit: 1000,
        counterField: "",
        weight: 1,
      });
      onRefresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setCreating(false);
    }
  };

  const resetAndOpenModal = () => {
    setNewRule({
      name: "",
      type: "popular_queries",
      collection: "",
      eventType: "search",
      destinationCollection: "",
      limit: 1000,
      counterField: "",
      weight: 1,
    });
    setShowCreateModal(true);
  };

  // Helper to display rule details regardless of v27 or v30 format
  const getDisplayInfo = (rule: AnalyticsRule) => {
    const collection = rule.collection
      || (rule.params?.source as { collections?: string[] })?.collections?.join(", ")
      || "—";
    const destination = (rule.params?.destination_collection as string)
      || (rule.params?.destination as { collection?: string })?.collection
      || "—";
    const eventType = rule.event_type || "—";
    return { collection, destination, eventType };
  };

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Analytics Rules</h3>
              <p className="text-xs text-gray-500">
                Track popular queries, no-result queries, and events
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={resetAndOpenModal}>
            <Plus className="h-4 w-4 mr-1" />
            Create Rule
          </Button>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-5 py-8">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 px-5">
              <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                No analytics rules configured
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Create rules to track popular queries, no-results queries, and other
                search analytics from your collections.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={resetAndOpenModal}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create your first rule
              </Button>
            </div>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRule === rule.name;
              const info = getDisplayInfo(rule);
              return (
                <div key={rule.name} className="group">
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      setExpandedRule(isExpanded ? null : rule.name)
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {rule.name}
                        </span>
                        <Badge variant="default">
                          {rule.type.replace(/_/g, " ")}
                        </Badge>
                        {rule.event_type && (
                          <Badge variant="default">
                            {rule.event_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {info.collection} → {info.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rule.name);
                        }}
                        disabled={deleting === rule.name}
                        title="Delete rule"
                      >
                        {deleting === rule.name ? (
                          <div className="h-4 w-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isExpanded ? "max-h-[500px]" : "max-h-0"
                    )}
                  >
                    <div className="px-5 pb-4 pl-[4.25rem]">
                      <div className="rounded-lg bg-gray-50 p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500 text-xs font-medium">Rule Name</span>
                            <p className="font-mono text-gray-900 mt-0.5">{rule.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs font-medium">Type</span>
                            <p className="font-mono text-gray-900 mt-0.5">{rule.type}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs font-medium">Source Collection</span>
                            <p className="font-mono text-gray-900 mt-0.5">{info.collection}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs font-medium">Destination</span>
                            <p className="font-mono text-gray-900 mt-0.5">{info.destination}</p>
                          </div>
                          {rule.event_type && (
                            <div>
                              <span className="text-gray-500 text-xs font-medium">Event Type</span>
                              <p className="font-mono text-gray-900 mt-0.5">{rule.event_type}</p>
                            </div>
                          )}
                          {rule.rule_tag && (
                            <div>
                              <span className="text-gray-500 text-xs font-medium">Rule Tag</span>
                              <p className="font-mono text-gray-900 mt-0.5">{rule.rule_tag}</p>
                            </div>
                          )}
                        </div>

                        {/* Raw params */}
                        <div>
                          <span className="text-gray-500 text-xs font-medium">Parameters</span>
                          <pre className="mt-1 text-xs font-mono bg-white rounded border border-gray-200 p-3 overflow-x-auto text-gray-700">
                            {JSON.stringify(rule.params, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Analytics Rule"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={creating}>
              Create Rule
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Rule Name"
            value={newRule.name}
            onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. popular_queries_rule"
          />
          <Select
            label="Rule Type"
            value={newRule.type}
            onChange={(e) => setNewRule((p) => ({ ...p, type: e.target.value }))}
            options={ruleTypes}
          />
          <Select
            label="Event Type"
            value={newRule.eventType}
            onChange={(e) => setNewRule((p) => ({ ...p, eventType: e.target.value }))}
            options={eventTypes}
            helperText="The type of event this rule listens to"
          />
          <Input
            label="Source Collection"
            value={newRule.collection}
            onChange={(e) => setNewRule((p) => ({ ...p, collection: e.target.value }))}
            placeholder="e.g. products"
            helperText="The collection to track events from"
          />
          <Input
            label="Destination Collection"
            value={newRule.destinationCollection}
            onChange={(e) => setNewRule((p) => ({ ...p, destinationCollection: e.target.value }))}
            placeholder="e.g. popular_queries"
            helperText="Collection where aggregated data will be stored (must already exist)"
          />
          <Input
            label="Limit"
            type="number"
            value={newRule.limit.toString()}
            onChange={(e) => setNewRule((p) => ({ ...p, limit: parseInt(e.target.value) || 1000 }))}
            helperText="Maximum number of entries to store"
          />

          {/* Counter-specific fields */}
          {newRule.type === "counter" && (
            <>
              <Input
                label="Counter Field"
                value={newRule.counterField}
                onChange={(e) => setNewRule((p) => ({ ...p, counterField: e.target.value }))}
                placeholder="e.g. popularity"
                helperText="The numeric field in the destination collection to increment"
              />
              <Input
                label="Weight"
                type="number"
                value={newRule.weight.toString()}
                onChange={(e) => setNewRule((p) => ({ ...p, weight: parseInt(e.target.value) || 1 }))}
                helperText="How much to increment the counter per event"
              />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
