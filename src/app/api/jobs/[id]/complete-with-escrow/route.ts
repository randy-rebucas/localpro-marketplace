/**
 * Escrow Release Handler
 * Manages escrow release for completed jobs
 * POST /api/jobs/[id]/complete-with-escrow
 * 
 * Calls Escrow Manager to:
 * - Auto-release funds if conditions met (48h + no disputes)
 * - Calculate commission (15%)
 * - Handle partial completion splits
 * - Queue for founder approval if needed
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  await connectDB();

  const { id: jobId } = await params;
  assertObjectId(jobId, "jobId");

  const body = await req.json().catch(() => ({}));
  const {
    jobAmount = 0,
    completedPercentage = 100,
    clientRating = 5,
    providerRating = 5,
    hasDisputes = false,
    daysSinceCompletion = 0,
  } = body;

  if (!jobAmount || jobAmount <= 0) {
    throw new ValidationError("Valid jobAmount is required");
  }

  try {
    // Call Escrow Manager AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/escrow-manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
      },
      body: JSON.stringify({
        jobId,
        jobAmount,
        jobStatus: "completed",
        completedPercentage,
        ratings: {
          client: clientRating,
          provider: providerRating,
        },
        disputes: {
          hasActive: hasDisputes,
          count: hasDisputes ? 1 : 0,
        },
        daysSinceCompletion,
      }),
    });

    if (!response.ok) {
      console.error("[Escrow Handler] AI agent failed:", response.status);
      throw new Error("Escrow management service failed");
    }

    const aiResult = await response.json();
    const decision = aiResult.decision;

    // If AI recommends auto-release: process immediately
    if (decision.shouldAutoRelease) {
      // Record the auto-release decision
      await AIDecisionService.createDecision({
        type: "PAYOUT",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: decision.riskLevel,
        recommendation: `Auto-release ${decision.releaseAmount} after ${decision.daysSinceCompletion} days with no disputes`,
        supportingEvidence: {
          fraudScore: 0,
          patternDetected: "Escrow auto-release conditions met",
        },
        relatedEntityType: "job",
        relatedEntityId: jobId,
      });

      // TODO: In production, call payment service to actually release funds
      // await paymentService.releaseEscrow(jobId, decision.releaseAmount);

      return NextResponse.json({
        success: true,
        message: "Escrow auto-released by AI",
        release: {
          status: "released",
          jobAmount,
          commission: decision.commission,
          providerAmount: decision.releaseAmount,
          holdAmount: decision.holdAmount,
          reason: decision.reasons[0],
        },
      });
    }

    // Otherwise: queue for founder review
    const aiDecision = await AIDecisionService.createDecision({
      type: "PAYOUT",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: decision.riskLevel,
      recommendation: `Manual review needed: ${decision.reasons?.[0] || "Unknown"}`,
      supportingEvidence: {
        fraudScore: 0,
        patternDetected: decision.reasons?.[0],
      },
      relatedEntityType: "job",
      relatedEntityId: jobId,
    });

    return NextResponse.json({
      success: true,
      message: "Escrow release queued for founder review",
      release: {
        status: "pending_review",
        jobAmount,
        recommendedRelease: decision.releaseAmount,
        recommendedHold: decision.holdAmount,
        commission: decision.commission,
        reasons: decision.reasons,
        aiDecisionId: aiDecision._id,
      },
    });
  } catch (error) {
    console.error("[Escrow Handler] Error:", error);
    throw new Error(`Escrow release failed: ${String(error)}`);
  }
});
