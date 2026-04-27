/**
 * AI Agent Metrics API
 * GET /api/admin/ai-metrics — Get agent performance metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async (req: NextRequest) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const agentName = searchParams.get("agentName") as any;

  try {
    if (agentName) {
      // Get detailed metrics for a single agent
      const metrics = await AIDecisionService.getAgentAccuracyMetrics(agentName);
      const riskDistribution = await AIDecisionService.getRiskDistribution(agentName);
      return NextResponse.json({ data: { ...metrics, riskDistribution } });
    }

    // Get metrics for all 11 agents (Phase 1-2, Phase 4, Phase 5, Phase 6, Phase 7)
    const agents = [
      // Phase 1-2: Core Operations
      "support_agent",
      "operations_manager",
      "dispute_resolver",
      // Phase 4: Identity & Fraud
      "kyc_verifier",
      "fraud_detector",
      // Phase 5: Sales (Already active)
      "sales_agent",
      // Phase 6: Booking & Escrow
      "booking_optimizer",
      "escrow_manager",
      // Phase 7: Quality & Growth
      "proactive_support",
      "review_moderator",
      "outreach_agent",
    ];
    
    // Get metrics and risk distributions for all agents
    const allMetrics = await Promise.all(
      agents.map((agent) => AIDecisionService.getAgentAccuracyMetrics(agent))
    );
    const allRiskDistributions = await Promise.all(
      agents.map((agent) => AIDecisionService.getRiskDistribution(agent))
    );

    // Calculate summary metrics
    const totalDecisions = allMetrics.reduce((sum, m) => sum + m.totalDecisions, 0);
    const totalCorrect = allMetrics.reduce((sum, m) => sum + m.correctDecisions, 0);
    const totalOverrides = allMetrics.reduce((sum, m) => sum + Math.round((m.overrideRate / 100) * m.totalDecisions), 0);
    
    const overallAutoApproveRate = totalDecisions > 0 ? ((totalDecisions - totalOverrides) / totalDecisions) * 100 : 0;
    const averageConfidenceScore = allMetrics.length > 0 ? allMetrics.reduce((sum, m) => sum + m.avgConfidenceScore, 0) / allMetrics.length : 0;

    // Calculate period (last 7 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const response = {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalDecisions,
        overallAutoApproveRate,
        averageConfidenceScore,
      },
      byAgent: allMetrics.map((m, i) => ({
        agentName: m.agentName,
        totalDecisions: m.totalDecisions,
        avgConfidenceScore: m.avgConfidenceScore,
        autoApproveRate: 100 - m.overrideRate,
        approvalRate: 100 - m.overrideRate,
        rejectionRate: m.overrideRate,
        riskDistribution: allRiskDistributions[i],
        accuracy: m.accuracyRate,
        overrideRate: m.overrideRate,
        avgConfidenceAccuracy: m.avgConfidenceScore,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AI Metrics] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
});
