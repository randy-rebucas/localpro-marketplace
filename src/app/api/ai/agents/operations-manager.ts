/**
 * Operations Manager Agent
 * Handles job validation, provider approval, and payout verification
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";
import mongoose from "mongoose";

interface OpsManagerInput {
  operationType: "job_validation" | "provider_approval" | "payout_verification";
  jobId?: string;
  providerId?: string;
  payoutId?: string;
  fraudScore?: number;
  behavioralFlags?: string[];
  jobAmount?: number;
  providerHistory?: {
    completedJobs: number;
    avgRating: number;
    totalEarnings: number;
    disputes: number;
    noShows: number;
  };
  jobDetails?: {
    category: string;
    budget: number;
    isFirstTimeClient: boolean;
    urgency: "standard" | "same_day" | "rush";
    description: string;
  };
}

interface OpsManagerResponse {
  decision: {
    action: "auto_approve" | "flag_for_review" | "escalate" | "reject";
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  reasoning: string;
  riskFactors: string[];
  recommendation: string;
  approvalThreshold?: number;
}

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Evaluate job for validation
 */
async function evaluateJobValidation(
  input: OpsManagerInput,
  client: OpenAI
): Promise<OpsManagerResponse> {
  if (!input.jobDetails) {
    return {
      decision: {
        action: "flag_for_review",
        confidence: 40,
        riskLevel: "high",
      },
      reasoning: "Missing job details for validation",
      riskFactors: ["incomplete_data"],
      recommendation: "Request additional job information before validation",
    };
  }

  // Base scoring
  let riskScore = input.fraudScore || 0;
  const riskFactors: string[] = [];

  // First-time client risk
  if (input.jobDetails.isFirstTimeClient) {
    riskScore += 15;
    riskFactors.push("first_time_client");
  }

  // Unusual job amount
  if (input.jobDetails.budget > 50000) {
    riskScore += 10;
    riskFactors.push("high_job_amount");
  }

  // Urgent jobs have slightly higher risk
  if (input.jobDetails.urgency !== "standard") {
    riskScore += 5;
    riskFactors.push("urgent_job");
  }

  // Behavioral flags
  if (input.behavioralFlags && input.behavioralFlags.length > 0) {
    riskScore += input.behavioralFlags.length * 10;
    riskFactors.push(...input.behavioralFlags);
  }

  // Determine action and confidence
  let action: OpsManagerResponse["decision"]["action"];
  let confidence: number;
  let riskLevel: OpsManagerResponse["decision"]["riskLevel"];

  if (riskScore < 30) {
    action = "auto_approve";
    confidence = 88;
    riskLevel = "low";
  } else if (riskScore < 50) {
    action = "flag_for_review";
    confidence = 75;
    riskLevel = "medium";
  } else if (riskScore < 70) {
    action = "escalate";
    confidence = 65;
    riskLevel = "high";
  } else {
    action = "reject";
    confidence = 80;
    riskLevel = "critical";
  }

  const reasoning = `Job validation analysis:
- Fraud score: ${riskScore}/100
- Risk factors: ${riskFactors.join(", ") || "none"}
- Category: ${input.jobDetails.category}
- Budget: ₱${input.jobDetails.budget.toLocaleString()}
- Client type: ${input.jobDetails.isFirstTimeClient ? "first_time" : "returning"}
- Recommendation: ${action.toUpperCase()}`;

  return {
    decision: { action, confidence, riskLevel },
    reasoning,
    riskFactors,
    recommendation: `${action === "auto_approve" ? "Job meets validation criteria. Safe to publish to marketplace." : `This job requires manual review before publication. Risk factors: ${riskFactors.join(", ")}`}`,
    approvalThreshold: riskScore,
  };
}

/**
 * Evaluate provider for approval
 */
async function evaluateProviderApproval(
  input: OpsManagerInput
): Promise<OpsManagerResponse> {
  if (!input.providerHistory) {
    return {
      decision: {
        action: "flag_for_review",
        confidence: 50,
        riskLevel: "high",
      },
      reasoning: "Missing provider history for evaluation",
      riskFactors: ["incomplete_history"],
      recommendation: "Request complete provider KYC documentation",
    };
  }

  const history = input.providerHistory;
  let riskScore = 0;
  const riskFactors: string[] = [];

  // New provider (high risk)
  if (history.completedJobs === 0) {
    riskScore = 70;
    riskFactors.push("new_provider");
  }

  // Low rating
  if (history.avgRating < 3.5 && history.completedJobs > 5) {
    riskScore += 25;
    riskFactors.push("low_rating");
  }

  // Dispute history
  if (history.disputes > history.completedJobs * 0.1) {
    // >10% dispute rate
    riskScore += 30;
    riskFactors.push("high_dispute_rate");
  }

  // No-show history
  if (history.noShows > history.completedJobs * 0.05) {
    riskScore += 20;
    riskFactors.push("no_show_history");
  }

  let action: OpsManagerResponse["decision"]["action"];
  let confidence: number;
  let riskLevel: OpsManagerResponse["decision"]["riskLevel"];

  if (riskScore < 30) {
    action = "auto_approve";
    confidence = 85;
    riskLevel = "low";
  } else if (riskScore < 50) {
    action = "flag_for_review";
    confidence = 70;
    riskLevel = "medium";
  } else if (riskScore < 70) {
    action = "escalate";
    confidence = 65;
    riskLevel = "high";
  } else {
    action = "reject";
    confidence = 80;
    riskLevel = "critical";
  }

  const reasoning = `Provider evaluation:
- Risk score: ${riskScore}/100
- Completed jobs: ${history.completedJobs}
- Average rating: ${history.avgRating}/5
- Disputes: ${history.disputes}
- No-shows: ${history.noShows}
- Total earnings: ₱${history.totalEarnings.toLocaleString()}`;

  return {
    decision: { action, confidence, riskLevel },
    reasoning,
    riskFactors,
    recommendation: `${action === "auto_approve" ? "Provider meets approval criteria" : `Manual KYC review required. Risk factors: ${riskFactors.join(", ")}`}`,
    approvalThreshold: riskScore,
  };
}

/**
 * Evaluate payout for verification
 */
async function evaluatePayoutVerification(
  input: OpsManagerInput
): Promise<OpsManagerResponse> {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Large withdrawal
  if ((input.jobAmount || 0) > 100000) {
    riskScore += 20;
    riskFactors.push("large_withdrawal");
  }

  // First withdrawal
  if ((input.providerHistory?.totalEarnings || 0) === 0) {
    riskScore += 15;
    riskFactors.push("first_withdrawal");
  }

  // Unusual pattern
  if (input.behavioralFlags && input.behavioralFlags.length > 0) {
    riskScore += input.behavioralFlags.length * 15;
    riskFactors.push(...input.behavioralFlags);
  }

  let action: OpsManagerResponse["decision"]["action"];
  let confidence: number;
  let riskLevel: OpsManagerResponse["decision"]["riskLevel"];

  if (riskScore < 25) {
    action = "auto_approve";
    confidence = 90;
    riskLevel = "low";
  } else if (riskScore < 50) {
    action = "flag_for_review";
    confidence = 75;
    riskLevel = "medium";
  } else {
    action = "escalate";
    confidence = 70;
    riskLevel = "high";
  }

  const reasoning = `Payout verification:
- Amount: ₱${input.jobAmount?.toLocaleString() || 0}
- Risk score: ${riskScore}/100
- Risk factors: ${riskFactors.join(", ") || "none"}
- Provider trust level: ${(input.providerHistory?.completedJobs || 0) > 50 ? "high" : (input.providerHistory?.completedJobs || 0) > 10 ? "medium" : "low"}`;

  return {
    decision: { action, confidence, riskLevel },
    reasoning,
    riskFactors,
    recommendation: `${action === "auto_approve" ? "Payout approved for processing" : "Payout requires verification before disbursement"}`,
    approvalThreshold: riskScore,
  };
}

/**
 * Main operations manager handler
 * POST /api/ai/agents/operations-manager
 */
export const POST = withHandler(async (req: NextRequest) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");

  const body = await req.json();
  const input: OpsManagerInput = body;

  if (!input.operationType) {
    return NextResponse.json(
      { error: "operationType is required" },
      { status: 400 }
    );
  }

  let evaluation: OpsManagerResponse;

  try {
    switch (input.operationType) {
      case "job_validation":
        if (!input.jobId) {
          return NextResponse.json(
            { error: "jobId required for job_validation" },
            { status: 400 }
          );
        }
        evaluation = await evaluateJobValidation(input, getClient()!);
        break;

      case "provider_approval":
        if (!input.providerId) {
          return NextResponse.json(
            { error: "providerId required for provider_approval" },
            { status: 400 }
          );
        }
        evaluation = await evaluateProviderApproval(input);
        break;

      case "payout_verification":
        if (!input.payoutId) {
          return NextResponse.json(
            { error: "payoutId required for payout_verification" },
            { status: 400 }
          );
        }
        evaluation = await evaluatePayoutVerification(input);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid operationType" },
          { status: 400 }
        );
    }

    // Create AI decision record
    const decision = await AIDecisionService.createDecision({
      type: "VALIDATION",
      agentName: "operations_manager",
      recommendation: evaluation.recommendation,
      confidenceScore: evaluation.decision.confidence,
      riskLevel: evaluation.decision.riskLevel,
      supportingEvidence: {
        fraudScore: input.fraudScore,
        behavioralFlags: evaluation.riskFactors,
        patternDetected: evaluation.reasoning,
      },
      relatedEntityType: input.operationType === "job_validation" ? "job" : "ticket",
      relatedEntityId: input.jobId || input.providerId || input.payoutId,
    });

    // If confidence high enough, auto-approve; otherwise queue for review
    const shouldAutoApprove =
      evaluation.decision.action === "auto_approve" &&
      evaluation.decision.confidence >= 80;

    if (shouldAutoApprove) {
      await AIDecisionService.approveDecision(decision._id.toString(), user.userId);

      return NextResponse.json(
        {
          decision: {
            id: decision._id,
            status: "approved",
            type: "VALIDATION",
            action: evaluation.decision.action,
            confidence: evaluation.decision.confidence,
            riskLevel: evaluation.decision.riskLevel,
          },
          evaluation,
          message: `Operation auto-approved (confidence: ${evaluation.decision.confidence}%)`,
        },
        { status: 200 }
      );
    }

    // Queue for manual review
    return NextResponse.json(
      {
        decision: {
          id: decision._id,
          status: "pending_review",
          type: "VALIDATION",
          action: evaluation.decision.action,
          confidence: evaluation.decision.confidence,
          riskLevel: evaluation.decision.riskLevel,
        },
        evaluation,
        message: `Operation queued for review (confidence: ${evaluation.decision.confidence}%)`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[Operations Manager] error:", error);
    return NextResponse.json(
      { error: "Failed to process operations request" },
      { status: 500 }
    );
  }
});
