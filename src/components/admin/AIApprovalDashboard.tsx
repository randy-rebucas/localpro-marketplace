"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, XCircle, Filter, ChevronDown } from "lucide-react";

interface AIDecision {
  _id: string;
  type: "VALIDATION" | "DISPUTE" | "PAYOUT" | "SUPPORT" | "LEAD_SCORING";
  agentName: string;
  status: "pending_review" | "approved" | "rejected" | "escalated";
  recommendation: string;
  confidenceScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface DashboardSummary {
  pendingCount: number;
  urgentCount: number;
  highRiskCount: number;
  byAgent: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

export default function AIApprovalDashboard() {
  const [filters, setFilters] = useState({
    status: "pending_review",
    riskLevel: [] as string[],
    agentName: "",
    sortBy: "createdAt",
  });
  const [selectedDecisions, setSelectedDecisions] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch decisions
  const { data: decisionsData, isLoading } = useQuery({
    queryKey: ["approval-queue", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: filters.status,
        riskLevel: filters.riskLevel.join(","),
        agentName: filters.agentName,
        sortBy: filters.sortBy,
        limit: "50",
      });

      const res = await fetch(`/api/admin/approval-queue?${params}`);
      if (!res.ok) throw new Error("Failed to fetch decisions");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (decisionId: string) => {
      const res = await fetch(`/api/admin/approval-queue/${decisionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executeAction: true }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ decisionId, reason }: { decisionId: string; reason: string }) => {
      const res = await fetch(`/api/admin/approval-queue/${decisionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    },
  });

  // Bulk approve
  const bulkApproveMutation = useMutation({
    mutationFn: async (decisionIds: string[]) => {
      const res = await fetch("/api/admin/approval-queue/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionIds }),
      });
      if (!res.ok) throw new Error("Failed to bulk approve");
      return res.json();
    },
    onSuccess: () => {
      setSelectedDecisions(new Set());
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
    },
  });

  const summary: DashboardSummary = decisionsData?.summary || {
    pendingCount: 0,
    urgentCount: 0,
    highRiskCount: 0,
    byAgent: {},
    byRiskLevel: {},
  };

  const decisions: AIDecision[] = decisionsData?.data || [];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SUPPORT":
        return "💬";
      case "VALIDATION":
        return "✓";
      case "DISPUTE":
        return "⚖️";
      case "PAYOUT":
        return "💰";
      case "LEAD_SCORING":
        return "🎯";
      default:
        return "•";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Approval Dashboard</h1>
        <p className="text-gray-600 mt-2">Review and approve AI-generated decisions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-500">Urgent (Critical/High Risk)</div>
          <div className="text-3xl font-bold text-red-600">{summary.urgentCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-500">High Risk</div>
          <div className="text-3xl font-bold text-yellow-600">{summary.highRiskCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Pending Review</div>
          <div className="text-3xl font-bold text-blue-600">{summary.pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">By Agent</div>
          <div className="text-sm mt-2">
            {Object.entries(summary.byAgent).map(([agent, count]) => (
              <div key={agent} className="text-xs text-gray-600">
                {agent}: {count}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
            <div className="flex gap-2 flex-wrap">
              {["critical", "high", "medium", "low"].map((risk) => (
                <button
                  key={risk}
                  onClick={() => {
                    const updated = filters.riskLevel.includes(risk)
                      ? filters.riskLevel.filter((r) => r !== risk)
                      : [...filters.riskLevel, risk];
                    setFilters({ ...filters, riskLevel: updated });
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filters.riskLevel.includes(risk)
                      ? getRiskColor(risk)
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
            <select
              value={filters.agentName}
              onChange={(e) => setFilters({ ...filters, agentName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Agents</option>
              {/* Phase 1-2: Core Operations */}
              <option value="support_agent">Support Agent</option>
              <option value="operations_manager">Operations Manager</option>
              <option value="dispute_resolver">Dispute Resolver</option>
              {/* Phase 4: Identity & Fraud */}
              <option value="kyc_verifier">KYC Verifier</option>
              <option value="fraud_detector">Fraud Detector</option>
              {/* Phase 5: Sales */}
              <option value="sales_agent">Sales Agent</option>
              {/* Phase 6: Booking & Escrow */}
              <option value="booking_optimizer">Booking Optimizer</option>
              <option value="escrow_manager">Escrow Manager</option>
              {/* Phase 7: Quality & Growth */}
              <option value="proactive_support">Proactive Support</option>
              <option value="review_moderator">Review Moderator</option>
              <option value="outreach_agent">Outreach Agent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="createdAt">Newest First</option>
              <option value="riskLevel">Risk Level</option>
              <option value="confidenceScore">Confidence (Low First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDecisions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-blue-900">
            {selectedDecisions.size} decision(s) selected
          </span>
          <button
            onClick={() =>
              bulkApproveMutation.mutate(Array.from(selectedDecisions))
            }
            disabled={bulkApproveMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Bulk Approve
          </button>
        </div>
      )}

      {/* Decisions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading decisions...</div>
        ) : decisions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending decisions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDecisions.size === decisions.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDecisions(new Set(decisions.map((d) => d._id)));
                        } else {
                          setSelectedDecisions(new Set());
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {decisions.map((decision) => (
                  <React.Fragment key={decision._id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDecisions.has(decision._id)}
                          onChange={(e) => {
                            const updated = new Set(selectedDecisions);
                            if (e.target.checked) {
                              updated.add(decision._id);
                            } else {
                              updated.delete(decision._id);
                            }
                            setSelectedDecisions(updated);
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-lg">{getTypeIcon(decision.type)}</span>
                        <span className="ml-2 text-gray-700">{decision.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {decision.agentName.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                            decision.riskLevel
                          )}`}
                        >
                          {decision.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${
                                decision.confidenceScore > 75
                                  ? "bg-green-500"
                                  : decision.confidenceScore > 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{
                                width: `${decision.confidenceScore}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {decision.confidenceScore}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(decision.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === decision._id ? null : decision._id)
                          }
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <ChevronDown
                            size={18}
                            className={`transform transition-transform ${
                              expandedId === decision._id ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedId === decision._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                AI Recommendation
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                                {decision.recommendation}
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() =>
                                  approveMutation.mutate(decision._id)
                                }
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason) {
                                    rejectMutation.mutate({
                                      decisionId: decision._id,
                                      reason,
                                    });
                                  }
                                }}
                                disabled={rejectMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
