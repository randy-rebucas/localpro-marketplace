"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

interface AgentMetrics {
  agentName: string;
  totalDecisions: number;
  avgConfidenceScore: number;
  autoApproveRate: number;
  approvalRate: number;
  rejectionRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  accuracy: number | null;
  overrideRate: number | null;
  avgConfidenceAccuracy: number | null;
}

interface MetricsResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalDecisions: number;
    overallAutoApproveRate: number;
    averageConfidenceScore: number;
  };
  byAgent: AgentMetrics[];
}

export default function AIMetricsDisplay() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/ai-metrics");
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics");
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 w-full bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-64 w-full bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <div className="px-6 py-4">
          <h3 className="font-semibold text-red-600">Error Loading Metrics</h3>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
        <div className="px-6 py-4 border-t">
          <p className="text-sm text-slate-600">
            Please ensure the API is running and you have the proper permissions.
          </p>
        </div>
      </Card>
    );
  }

  if (!metrics || !metrics.summary) {
    return (
      <Card>
        <div className="px-6 py-4">
          <h3 className="font-semibold">No Data Available</h3>
        </div>
        <div className="px-6 py-4 border-t">
          <p className="text-sm text-slate-600">
            No metrics data available. Run agents to generate metrics.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-slate-600">Total Decisions</h3>
            <div className="text-3xl font-bold mt-2">{(metrics.summary.totalDecisions || 0).toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-slate-600">Auto-Approve Rate</h3>
            <div className="text-3xl font-bold mt-2">{(metrics.summary.overallAutoApproveRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">Overall rate</p>
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-slate-600">Avg Confidence</h3>
            <div className="text-3xl font-bold mt-2">{(metrics.summary.averageConfidenceScore || 0).toFixed(0)}</div>
            <p className="text-xs text-slate-500 mt-1">0-100 scale</p>
          </div>
        </Card>
      </div>

      {/* Agent Details */}
      <Card>
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold">Metrics by Agent</h3>
          <p className="text-sm text-slate-600 mt-1">Performance across all 11 AI agents</p>
        </div>
        <div className="px-6 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-slate-600">
                  <th className="text-left py-2 px-2">Agent</th>
                  <th className="text-right py-2 px-2">Decisions</th>
                  <th className="text-right py-2 px-2">Confidence</th>
                  <th className="text-right py-2 px-2">Auto-Approve %</th>
                  <th className="text-right py-2 px-2">Accuracy %</th>
                  <th className="text-right py-2 px-2">Risk (L/M/H/C)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byAgent.map((agent) => (
                  <tr key={agent.agentName} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">
                      {agent.agentName.replace(/_/g, " ").toUpperCase()}
                    </td>
                    <td className="text-right py-3 px-2">{agent.totalDecisions}</td>
                    <td className="text-right py-3 px-2">{agent.avgConfidenceScore.toFixed(0)}</td>
                    <td className="text-right py-3 px-2">{agent.autoApproveRate.toFixed(1)}%</td>
                    <td className="text-right py-3 px-2">
                      {agent.accuracy !== null ? `${agent.accuracy.toFixed(0)}%` : "N/A"}
                    </td>
                    <td className="text-right py-3 px-2 text-xs">
                      {agent.riskDistribution.low}/{agent.riskDistribution.medium}/
                      {agent.riskDistribution.high}/{agent.riskDistribution.critical}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Period Info */}
      <div className="text-xs text-slate-500 text-center">
        Data from {new Date(metrics.period.startDate).toLocaleDateString()} to{" "}
        {new Date(metrics.period.endDate).toLocaleDateString()}
      </div>
    </div>
  );
}
