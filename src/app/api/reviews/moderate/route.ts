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
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { AIDecisionService } from "@/services/ai-decision.service";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import { z } from "zod";

const ModerateSchema = z.object({
  reviewId:   z.string().regex(/^[a-f\d]{24}$/i, "Invalid reviewId"),
  targetId:   z.string().regex(/^[a-f\d]{24}$/i, "Invalid targetId"),
  rating:     z.number().int().min(1).max(5),
  content:    z.string().min(10).max(5000),
  targetType: z.enum(["provider", "client"]).default("provider"),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  // Only admin/staff may trigger AI moderation directly
  requireCapability(user, "manage_disputes");

  const rl = await checkRateLimit(`review-moderate:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const parsed = ModerateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { reviewId, rating, content, targetId, targetType } = parsed.data;

  // TODO: fetch real reviewerHistory and targetHistory from DB here
  const reviewerHistory = { totalReviews: 1, avgRating: rating, accountAge: 30 };
  const targetHistory   = { reviewCount: 1, avgRating: rating, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const agentRes = await fetch(`${appUrl}/api/ai/agents/review-moderator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      reviewId, rating, content,
      reviewerId: user.userId,
      targetId, targetType,
      reviewerHistory, targetHistory,
    }),
  });

  if (!agentRes.ok) {
    throw new ValidationError("Review moderation service unavailable");
  }

  const { decision } = await agentRes.json();

  if (decision.shouldAutoApprove) {
    await AIDecisionService.createDecision({
      type: "SUPPORT",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: decision.riskLevel,
      recommendation: "Review approved - low moderation risk",
      supportingEvidence: {
        fraudScore: 100 - (decision.suspicionScore || 0),
        patternDetected: "Review verified as legitimate",
      },
      relatedEntityType: "job",
      relatedEntityId: reviewId as never,
    });
    return NextResponse.json({
      success: true,
      decision: { status: "approved", suspicionScore: decision.suspicionScore, publishedAt: new Date().toISOString() },
    });
  }

  if (decision.shouldReject) {
    await AIDecisionService.createDecision({
      type: "SUPPORT",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: "high",
      recommendation: `Review rejected: ${(decision.reasons as string[] | undefined)?.join(", ") ?? "Suspicious content"}`,
      supportingEvidence: { fraudScore: decision.suspicionScore, behavioralFlags: decision.reasons },
      relatedEntityType: "job",
      relatedEntityId: reviewId as never,
    });
    return NextResponse.json(
      { success: false, decision: { status: "rejected", suspicionScore: decision.suspicionScore, reasons: decision.reasons } },
      { status: 403 }
    );
  }

  const aiDecision = await AIDecisionService.createDecision({
    type: "SUPPORT",
    agentName: "support_agent",
    confidenceScore: decision.confidence,
    riskLevel: "medium",
    recommendation: `Review flagged: ${(decision.reasons as string[] | undefined)?.join(", ") ?? "Moderate concern"}`,
    supportingEvidence: { fraudScore: decision.suspicionScore, behavioralFlags: decision.suspiciousIndicators },
    relatedEntityType: "job",
    relatedEntityId: reviewId as never,
  });

  return NextResponse.json({
    success: true,
    decision: { status: "flagged", suspicionScore: decision.suspicionScore, indicators: decision.suspiciousIndicators, aiDecisionId: aiDecision._id },
  });
});
