/**
 * Dispute Resolver Agent
 * Analyzes dispute evidence and recommends resolution (escrow release amount)
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";
import { checkRateLimit } from "@/lib/rateLimit";

interface DisputeResolverInput {
  disputeId: string;
  jobAmount: number;
  reason: string;
  evidence?: string[]; // URLs to evidence images
  raisedByRole: "client" | "provider";
  jobCompletionDetails?: {
    beforePhotos?: string[];
    afterPhotos?: string[];
    description: string;
    completionDate?: Date;
  };
  raisedByHistory?: {
    totalTransactions: number;
    avgRating: number;
    disputes: number;
    reputation: "trusted" | "average" | "suspect";
  };
  otherPartyHistory?: {
    totalTransactions: number;
    avgRating: number;
    disputes: number;
    reputation: "trusted" | "average" | "suspect";
  };
  previousCommunication?: string;
}

interface DisputeResolution {
  decision: {
    recommendedResolution: "full_release" | "partial_release" | "full_refund" | "escalate";
    releasePercentage?: number;
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  reasoning: string;
  evidenceAnalysis: string;
  riskFactors: string[];
  recommendation: string;
  chargeHandlingFee: boolean;
  chargeParty?: "client" | "provider" | "both";
}

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Analyze dispute evidence and context
 */
async function analyzeDispute(
  input: DisputeResolverInput,
  client: OpenAI
): Promise<DisputeResolution> {
  let confidence = 70;
  let riskLevel: "low" | "medium" | "high" | "critical" = "medium";
  let recommendedResolution: DisputeResolution["decision"]["recommendedResolution"] = "partial_release";
  let releasePercentage = 50;
  const riskFactors: string[] = [];

  // Base scoring on dispute reason
  const reasonLower = input.reason.toLowerCase();
  let clientFavor = 0; // Negative = favor provider, Positive = favor client

  // Common dispute reasons analysis
  if (reasonLower.includes("not completed") || reasonLower.includes("not started")) {
    clientFavor += 30;
    riskFactors.push("incomplete_work");
  } else if (reasonLower.includes("poor quality") || reasonLower.includes("bad quality")) {
    clientFavor += 20;
    riskFactors.push("quality_complaint");
  } else if (reasonLower.includes("no show") || reasonLower.includes("didn't arrive")) {
    clientFavor += 25;
    riskFactors.push("no_show");
  } else if (
    reasonLower.includes("delayed") ||
    reasonLower.includes("late") ||
    reasonLower.includes("slow")
  ) {
    clientFavor += 10;
    riskFactors.push("delay_complaint");
  } else if (reasonLower.includes("incomplete payment") || reasonLower.includes("partial")) {
    clientFavor -= 20;
    riskFactors.push("payment_dispute");
  }

  // Reputation weighting
  if (input.raisedByHistory) {
    if (input.raisedByHistory.reputation === "trusted") {
      clientFavor += 15;
      confidence += 5;
    } else if (input.raisedByHistory.reputation === "suspect") {
      clientFavor -= 20;
      confidence -= 10;
      riskFactors.push("suspicious_raiser");
    }

    // High dispute history
    if (
      input.raisedByHistory.disputes >
      input.raisedByHistory.totalTransactions * 0.2
    ) {
      clientFavor = Math.max(clientFavor - 15, -50);
      riskFactors.push("high_dispute_history");
    }
  }

  if (input.otherPartyHistory) {
    if (input.otherPartyHistory.reputation === "trusted") {
      clientFavor -= 10;
      confidence += 5;
    } else if (input.otherPartyHistory.reputation === "suspect") {
      clientFavor += 15;
      confidence -= 10;
    }
  }

  // Evidence quality
  if (input.evidence && input.evidence.length > 2) {
    confidence += 10;
  } else if (!input.evidence || input.evidence.length === 0) {
    confidence -= 15;
    riskFactors.push("no_evidence");
  }

  // Job completion photos
  if (
    input.jobCompletionDetails?.beforePhotos &&
    input.jobCompletionDetails?.afterPhotos
  ) {
    confidence += 8;
  }

  // Determine resolution
  confidence = Math.min(Math.max(confidence, 30), 90);

  if (clientFavor > 60) {
    recommendedResolution = "full_refund";
    releasePercentage = 0;
    riskLevel = "medium";
  } else if (clientFavor > 30) {
    recommendedResolution = "partial_release";
    releasePercentage = 30;
    riskLevel = "medium";
  } else if (clientFavor > 0) {
    recommendedResolution = "partial_release";
    releasePercentage = 60;
    riskLevel = "low";
  } else if (clientFavor > -30) {
    recommendedResolution = "full_release";
    releasePercentage = 100;
    riskLevel = "low";
  } else {
    recommendedResolution = "escalate";
    riskLevel = "high";
    riskFactors.push("ambiguous_dispute");
  }

  // Escalate for very high amounts or very uncertain
  if (input.jobAmount > 100000 || confidence < 50) {
    recommendedResolution = "escalate";
    riskLevel = "high";
  }

  let chargeHandlingFee = false;
  let chargeParty: "client" | "provider" | "both" | undefined;

  // Determine handling fee
  if (recommendedResolution !== "escalate") {
    chargeHandlingFee = true;
    if (clientFavor > 0) {
      chargeParty = "provider";
    } else {
      chargeParty = "client";
    }
  }

  const reasoning = `Dispute analysis:
- Reason: ${input.reason}
- Job amount: ₱${input.jobAmount.toLocaleString()}
- Evidence quality: ${input.evidence?.length || 0} items
- Raised by: ${input.raisedByRole} (reputation: ${input.raisedByHistory?.reputation || "unknown"})
- Other party: ${input.otherPartyHistory?.reputation || "unknown"}
- Verdict: ${
    clientFavor > 0 ? "Favors client" : clientFavor < 0 ? "Favors provider" : "Neutral"
  }`;

  const recommendation =
    recommendedResolution === "escalate"
      ? "This dispute requires manual investigation by support team."
      : `Release ${releasePercentage}% of escrow (₱${Math.round(
          (input.jobAmount * releasePercentage) / 100
        ).toLocaleString()}) to provider${chargeParty === "client" ? ", charge ₱100 handling fee to client" : chargeParty === "provider" ? ", charge ₱100 handling fee to provider" : ""}`;

  const evidenceAnalysis = `Evidence review: ${
    input.evidence && input.evidence.length > 0
      ? `${input.evidence.length} evidence items provided`
      : "No evidence provided"
  }${
    input.jobCompletionDetails?.beforePhotos && input.jobCompletionDetails?.afterPhotos
      ? "; Before/after photos available"
      : ""
  }`;

  return {
    decision: {
      recommendedResolution,
      releasePercentage,
      confidence,
      riskLevel,
    },
    reasoning,
    evidenceAnalysis,
    riskFactors,
    recommendation,
    chargeHandlingFee,
    chargeParty,
  };
}

/**
 * Main dispute resolver handler
 * POST /api/ai/agents/dispute-resolver
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_disputes");
  const rl = await checkRateLimit(`ai:dispute-resolver:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const input: DisputeResolverInput = {
    ...body,
    raisedByRole: body.raisedByRole || "client",
  };

  // Validate input
  if (!input.disputeId || !input.reason || !input.jobAmount) {
    return NextResponse.json(
      { error: "Missing required fields: disputeId, reason, jobAmount" },
      { status: 400 }
    );
  }

  try {
    // Analyze dispute
    const resolution = await analyzeDispute(input, getClient()!);

    // Create AI decision record
    const decision = await AIDecisionService.createDecision({
      type: "DISPUTE",
      agentName: "dispute_resolver",
      recommendation: resolution.recommendation,
      confidenceScore: resolution.decision.confidence,
      riskLevel: resolution.decision.riskLevel,
      supportingEvidence: {
        behavioralFlags: resolution.riskFactors,
        patternDetected: resolution.evidenceAnalysis,
      },
      relatedEntityType: "dispute",
      relatedEntityId: input.disputeId,
    });

    // Always queue disputes for manual approval (high stakes)
    return NextResponse.json(
      {
        decision: {
          id: decision._id,
          status: "pending_review",
          type: "DISPUTE",
          recommendedResolution: resolution.decision.recommendedResolution,
          releasePercentage: resolution.decision.releasePercentage,
          confidence: resolution.decision.confidence,
          riskLevel: resolution.decision.riskLevel,
          chargeHandlingFee: resolution.chargeHandlingFee,
          chargeParty: resolution.chargeParty,
        },
        analysis: {
          reasoning: resolution.reasoning,
          evidenceAnalysis: resolution.evidenceAnalysis,
          riskFactors: resolution.riskFactors,
          recommendation: resolution.recommendation,
        },
        message: `Dispute analysis complete. Recommendation: ${resolution.recommendation}. Requires your approval.`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[Dispute Resolver] error:", error);
    return NextResponse.json(
      { error: "Failed to analyze dispute" },
      { status: 500 }
    );
  }
});
