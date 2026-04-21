/**
 * AI Decision Service
 * Handles creation, retrieval, and management of AI decisions pending approval
 */

import { connectDB } from "@/lib/db";
import { AIDecisionModel, type IAIDecision, type AIDecisionType, type AIAgentName, type AIRiskLevel } from "@/models/AIDecision";
import { AIFeedbackModel, type IAIFeedback } from "@/models/AIFeedback";
import type mongoose from "mongoose";

export interface CreateDecisionInput {
  type: AIDecisionType;
  agentName: IAIDecision["agentName"];
  recommendation: string;
  confidenceScore: number;
  riskLevel: AIRiskLevel;
  supportingEvidence?: IAIDecision["supportingEvidence"];
  relatedEntityType?: IAIDecision["relatedEntityType"];
  relatedEntityId?: string;
}

export interface ApprovalQueueFilters {
  status?: "pending_review" | "approved" | "rejected" | "escalated";
  riskLevel?: AIRiskLevel | AIRiskLevel[];
  agentName?: string;
  type?: AIDecisionType;
  limit?: number;
  skip?: number;
  sortBy?: "riskLevel" | "confidenceScore" | "createdAt";
}

export class AIDecisionService {
  /**
   * Create a new AI decision pending approval
   */
  static async createDecision(input: CreateDecisionInput): Promise<IAIDecision> {
    await connectDB();

    const decision = new AIDecisionModel({
      type: input.type,
      agentName: input.agentName,
      recommendation: input.recommendation,
      confidenceScore: input.confidenceScore,
      riskLevel: input.riskLevel,
      supportingEvidence: input.supportingEvidence,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId ? new (require("mongoose").Types.ObjectId)(input.relatedEntityId) : undefined,
      status: "pending_review",
    });

    return await decision.save();
  }

  /**
   * Get pending decisions for approval queue
   */
  static async getPendingDecisions(filters: ApprovalQueueFilters = {}): Promise<{
    decisions: IAIDecision[];
    total: number;
  }> {
    await connectDB();

    const query: Record<string, any> = { status: filters.status || "pending_review" };

    if (filters.riskLevel) {
      if (Array.isArray(filters.riskLevel)) {
        query.riskLevel = { $in: filters.riskLevel };
      } else {
        query.riskLevel = filters.riskLevel;
      }
    }

    if (filters.agentName) {
      query.agentName = filters.agentName;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const limit = filters.limit || 20;
    const skip = filters.skip || 0;

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (filters.sortBy === "riskLevel") {
      sortObj = { riskLevel: -1, createdAt: -1 };
    } else if (filters.sortBy === "confidenceScore") {
      sortObj = { confidenceScore: 1, createdAt: -1 };
    }

    const [decisions, total] = await Promise.all([
      AIDecisionModel.find(query)
        .sort(sortObj)
        .limit(limit)
        .skip(skip)
        .lean(),
      AIDecisionModel.countDocuments(query),
    ]);

    return { decisions: decisions as any as IAIDecision[], total };
  }

  /**
   * Get a single decision by ID
   */
  static async getDecision(id: string): Promise<IAIDecision | null> {
    await connectDB();
    return AIDecisionModel.findById(id).lean() as any;
  }

  /**
   * Approve a decision
   */
  static async approveDecision(
    decisionId: string,
    userId: string,
    executionCallback?: () => Promise<void>
  ): Promise<IAIDecision> {
    await connectDB();

    const decision = await AIDecisionModel.findByIdAndUpdate(
      decisionId,
      {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!decision) {
      throw new Error("Decision not found");
    }

    // Execute the callback if provided (e.g., actually process the approval)
    if (executionCallback) {
      try {
        await executionCallback();
      } catch (err) {
        console.error("[AIDecisionService] Execution callback failed:", err);
        throw err;
      }
    }

    return decision;
  }

  /**
   * Reject a decision
   */
  static async rejectDecision(
    decisionId: string,
    userId: string,
    reason: string
  ): Promise<IAIDecision> {
    await connectDB();

    const decision = await AIDecisionModel.findByIdAndUpdate(
      decisionId,
      {
        status: "rejected",
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      { new: true }
    );

    if (!decision) {
      throw new Error("Decision not found");
    }

    return decision;
  }

  /**
   * Escalate a decision to urgent attention
   */
  static async escalateDecision(
    decisionId: string,
    reason: string
  ): Promise<IAIDecision> {
    await connectDB();

    const decision = await AIDecisionModel.findByIdAndUpdate(
      decisionId,
      {
        status: "escalated",
        escalatedReason: reason,
      },
      { new: true }
    );

    if (!decision) {
      throw new Error("Decision not found");
    }

    return decision;
  }

  /**
   * Record feedback on a decision (for retraining)
   */
  static async recordFeedback(
    decisionId: string,
    feedback: Partial<IAIFeedback>
  ): Promise<IAIFeedback> {
    await connectDB();

    const decision = await AIDecisionModel.findById(decisionId);
    if (!decision) {
      throw new Error("Decision not found");
    }

    const feedbackDoc = new AIFeedbackModel({
      decisionId,
      agentName: decision.agentName,
      decisionType: decision.type,
      ...feedback,
    });

    return await feedbackDoc.save();
  }

  /**
   * Get approval dashboard summary
   */
  static async getApprovalDashboardSummary(): Promise<{
    pendingCount: number;
    urgentCount: number;
    highRiskCount: number;
    byAgent: Record<string, number>;
    byRiskLevel: Record<string, number>;
  }> {
    await connectDB();

    const [pendingDecisions, urgentDecisions, highRiskDecisions] = await Promise.all([
      AIDecisionModel.countDocuments({ status: "pending_review" }),
      AIDecisionModel.countDocuments({
        status: "pending_review",
        riskLevel: { $in: ["critical", "high"] },
      }),
      AIDecisionModel.countDocuments({ status: "pending_review", riskLevel: "high" }),
    ]);

    const byAgent = await AIDecisionModel.aggregate([
      { $match: { status: "pending_review" } },
      { $group: { _id: "$agentName", count: { $sum: 1 } } },
    ]);

    const byRiskLevel = await AIDecisionModel.aggregate([
      { $match: { status: "pending_review" } },
      { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
    ]);

    return {
      pendingCount: pendingDecisions,
      urgentCount: urgentDecisions,
      highRiskCount: highRiskDecisions,
      byAgent: Object.fromEntries(byAgent.map((a: any) => [a._id, a.count])),
      byRiskLevel: Object.fromEntries(byRiskLevel.map((r: any) => [r._id, r.count])),
    };
  }

  /**
   * Get agent accuracy metrics
   */
  static async getAgentAccuracyMetrics(agentName?: string): Promise<{
    agentName: string;
    totalDecisions: number;
    correctDecisions: number;
    incorrectDecisions: number;
    accuracyRate: number;
    overrideRate: number;
    avgConfidenceScore: number;
  }> {
    await connectDB();

    // Get data from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = agentName ? { agentName } : {};

    const feedback = await AIFeedbackModel.aggregate([
      { $match: { ...query, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: "$agentName",
          totalDecisions: { $sum: 1 },
          correctDecisions: { $sum: { $cond: ["$wasCorrect", 1, 0] } },
          incorrectDecisions: { $sum: { $cond: ["$wasCorrect", 0, 1] } },
          overrideCount: { $sum: { $cond: ["$userOverride", 1, 0] } },
          avgConfidence: {
            $avg: "$confidenceAccuracy.aiConfidence",
          },
        },
      },
    ]);

    if (feedback.length === 0) {
      return {
        agentName: agentName || "unknown",
        totalDecisions: 0,
        correctDecisions: 0,
        incorrectDecisions: 0,
        accuracyRate: 0,
        overrideRate: 0,
        avgConfidenceScore: 0,
      };
    }

    const stats = feedback[0];
    return {
      agentName: stats._id,
      totalDecisions: stats.totalDecisions,
      correctDecisions: stats.correctDecisions,
      incorrectDecisions: stats.incorrectDecisions,
      accuracyRate: stats.totalDecisions > 0 ? (stats.correctDecisions / stats.totalDecisions) * 100 : 0,
      overrideRate: stats.totalDecisions > 0 ? (stats.overrideCount / stats.totalDecisions) * 100 : 0,
      avgConfidenceScore: stats.avgConfidence || 0,
    };
  }

  /**
   * Get risk distribution for an agent
   * Returns count of decisions by risk level (low, medium, high, critical)
   */
  static async getRiskDistribution(agentName?: string): Promise<{
    low: number;
    medium: number;
    high: number;
    critical: number;
  }> {
    await connectDB();

    // Get decisions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = agentName ? { agentName } : {};

    const distribution = await AIDecisionModel.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: "$riskLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format result with safe defaults
    const result = { low: 0, medium: 0, high: 0, critical: 0 };
    distribution.forEach((d: any) => {
      if (d._id && d._id in result) {
        result[d._id as keyof typeof result] = d.count;
      }
    });

    return result;
  }
}
