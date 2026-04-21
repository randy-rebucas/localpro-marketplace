/**
 * Review Moderation Handler
 * Verifies reviews before publishing to marketplace
 * POST /api/reviews/moderate
 * 
 * Calls Review Moderator to:
 * - Detect fake/spam reviews
 * - Flag suspicious rating patterns
 * - Auto-approve legitimate reviews
 * - Block obviously fraudulent reviews
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const body = await req.json().catch(() => ({}));
  const {
    reviewId,
    rating = 5,
    content = "",
    targetId,
    targetType = "provider",
  } = body;

  if (!reviewId || !targetId) {
    throw new ValidationError("reviewId and targetId are required");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("rating must be an integer between 1 and 5");
  }

  if (typeof content !== "string" || content.trim().length < 10) {
    throw new ValidationError(
      "Review content must be at least 10 characters long"
    );
  }

  const userId = user.userId;

  try {
    // Fetch reviewer and target history from database
    // TODO: Fetch reviewer history and target review distribution
    // For now, using defaults from request

    const reviewerHistory = body.reviewerHistory || {
      totalReviews: 1,
      avgRating: rating,
      accountAge: 30, // days
    };

    const targetHistory = body.targetHistory || {
      reviewCount: 1,
      avgRating: rating,
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 1,
      },
    };

    // Call Review Moderator AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/review-moderator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
      },
      body: JSON.stringify({
        reviewId,
        rating,
        content,
        reviewerId: userId,
        targetId,
        targetType,
        reviewerHistory,
        targetHistory,
      }),
    });

    if (!response.ok) {
      console.error("[Review Handler] AI agent failed:", response.status);
      throw new Error("Review moderation service failed");
    }

    const aiResult = await response.json();
    const decision = aiResult.decision;

    // If auto-approved: publish immediately
    if (decision.shouldAutoApprove) {
      await AIDecisionService.createDecision({
        type: "SUPPORT",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: decision.riskLevel,
        recommendation: `Review approved - low moderation risk`,
        supportingEvidence: {
          fraudScore: 100 - (decision.suspicionScore || 0),
          patternDetected: "Review verified as legitimate",
        },
        relatedEntityType: "job",
        relatedEntityId: reviewId as any,
      });

      return NextResponse.json({
        success: true,
        message: "Review approved by AI moderation",
        decision: {
          status: "approved",
          suspicionScore: decision.suspicionScore,
          publishedAt: new Date().toISOString(),
        },
      });
    }

    // If rejected: block completely
    if (decision.shouldReject) {
      await AIDecisionService.createDecision({
        type: "SUPPORT",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: "high",
        recommendation: `Review rejected due to moderation flags: ${decision.reasons?.join(", ") || "Suspicious content"}`,
        supportingEvidence: {
          fraudScore: decision.suspicionScore,
          behavioralFlags: decision.reasons,
        },
        relatedEntityType: "job",
        relatedEntityId: reviewId as any,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Review rejected by AI moderation",
          decision: {
            status: "rejected",
            suspicionScore: decision.suspicionScore,
            reasons: decision.reasons,
          },
        },
        { status: 403 }
      );
    }

    // If flagged: queue for manual review
    const aiDecision = await AIDecisionService.createDecision({
      type: "SUPPORT",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: "medium",
      recommendation: `Review flagged for manual moderation: ${decision.reasons?.join(", ") || "Moderate concern"}`,
      supportingEvidence: {
        fraudScore: decision.suspicionScore,
        behavioralFlags: decision.suspiciousIndicators,
      },
      relatedEntityType: "job",
      relatedEntityId: reviewId as any,
    });

    return NextResponse.json({
      success: true,
      message: "Review flagged for manual moderation",
      decision: {
        status: "flagged",
        suspicionScore: decision.suspicionScore,
        indicators: decision.suspiciousIndicators,
        aiDecisionId: aiDecision._id,
      },
    });
  } catch (error) {
    console.error("[Review Handler] Error:", error);
    throw new Error(`Review moderation failed: ${String(error)}`);
  }
});
