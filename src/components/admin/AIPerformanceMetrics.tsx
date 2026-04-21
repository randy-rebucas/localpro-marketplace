"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AgentMetrics {
  agentName: string;
  totalDecisions: number;
  correctDecisions: number;
  incorrectDecisions: number;
  accuracyRate: number;
  overrideRate: number;
  avgConfidenceScore: number;
}

export default function AIPerformanceMetrics() {
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined);

  // Fetch all agent metrics
  const { data: allMetrics } = useQuery({
    queryKey: ["ai-agent-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json() as Promise<{ data: AgentMetrics[] }>;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch single agent detailed metrics
  const { data: detailedMetrics } = useQuery({
    queryKey: ["ai-agent-metrics-detailed", selectedAgent],
    queryFn: async () => {
      if (!selectedAgent) return null;
      const res = await fetch(
        `/api/admin/ai-metrics?agentName=${encodeURIComponent(selectedAgent)}`
      );
      if (!res.ok) throw new Error("Failed to fetch detailed metrics");
      return res.json();
    },
    enabled: !!selectedAgent,
  });

  const agents: AgentMetrics[] = allMetrics?.data || [];

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 75) return "text-blue-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (accuracy: number) => {
    if (accuracy >= 85) return <TrendingUp className="text-green-600" size={18} />;
    if (accuracy >= 60) return <TrendingDown className="text-yellow-600" size={18} />;
    return <TrendingDown className="text-red-600" size={18} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Agent Performance</h1>
        <p className="text-gray-600 mt-2">Track accuracy, override rates, and confidence scores</p>
      </div>

      {/* Agent Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {agents.map((agent) => (
          <div
            key={agent.agentName}
            onClick={() => setSelectedAgent(agent.agentName)}
            className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
              selectedAgent === agent.agentName
                ? "ring-2 ring-blue-500 shadow-lg"
                : "hover:shadow-lg"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {agent.agentName.replace(/_/g, " ")}
                </h3>
                <p className="text-sm text-gray-500">
                  {agent.totalDecisions} total decisions
                </p>
              </div>
              {getTrendIcon(agent.accuracyRate)}
            </div>

            <div className="space-y-3">
              {/* Accuracy */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Accuracy</span>
                  <span className={`font-bold ${getAccuracyColor(agent.accuracyRate)}`}>
                    {agent.accuracyRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      agent.accuracyRate >= 85
                        ? "bg-green-500"
                        : agent.accuracyRate >= 70
                        ? "bg-blue-500"
                        : agent.accuracyRate >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(agent.accuracyRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Override Rate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Override Rate</span>
                  <span className="font-bold text-gray-900">
                    {agent.overrideRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{
                      width: `${Math.min(agent.overrideRate, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Avg Confidence */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Avg Confidence
                  </span>
                  <span className="font-bold text-gray-900">
                    {agent.avgConfidenceScore.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min(agent.avgConfidenceScore, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Decision Counts */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Correct</p>
                <p className="text-lg font-bold text-green-600">
                  {agent.correctDecisions}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Incorrect</p>
                <p className="text-lg font-bold text-red-600">
                  {agent.incorrectDecisions}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analysis */}
      {selectedAgent && detailedMetrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedAgent.replace(/_/g, " ")} — Detailed Analysis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Confidence Score Distribution */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Confidence Score</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">90-100%</span>
                  <span className="font-semibold text-green-600">
                    {detailedMetrics.confidenceDistribution?.[5] || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">75-89%</span>
                  <span className="font-semibold text-blue-600">
                    {detailedMetrics.confidenceDistribution?.[4] || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">60-74%</span>
                  <span className="font-semibold text-yellow-600">
                    {detailedMetrics.confidenceDistribution?.[3] || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">&lt;60%</span>
                  <span className="font-semibold text-red-600">
                    {detailedMetrics.confidenceDistribution?.[0] || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Time to Approval */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Time to Approval</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Same Day</span>
                  <span className="font-semibold">
                    {detailedMetrics.timeToApprovalStats?.sameDay || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Next Day</span>
                  <span className="font-semibold">
                    {detailedMetrics.timeToApprovalStats?.nextDay || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-semibold">
                    {detailedMetrics.timeToApprovalStats?.pending || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Distribution */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Risk Level Distribution</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Critical</span>
                  <span className="font-semibold text-red-600">
                    {detailedMetrics.riskDistribution?.critical || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">High</span>
                  <span className="font-semibold text-orange-600">
                    {detailedMetrics.riskDistribution?.high || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Medium</span>
                  <span className="font-semibold text-yellow-600">
                    {detailedMetrics.riskDistribution?.medium || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Low</span>
                  <span className="font-semibold text-green-600">
                    {detailedMetrics.riskDistribution?.low || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
