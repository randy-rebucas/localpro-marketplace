/**
 * Fraud Detection Handler for Payouts/Withdrawals
 * Verifies transactions before processing
 * POST /api/payouts/verify
 * 
 * Called before any payout is processed to detect:
 * - Unusual withdrawal amounts
 * - New account large withdrawals
 * - Multiple chargebacks/disputes
 * - Rapid withdrawal patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { userRepository } from "@/repositories";
import { AIDecisionService } from "@/services/ai-decision.service";
import { checkRateLimit } from "@/lib/rateLimit";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`payout-verify:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { transactionId, amount } = body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new ValidationError("Valid amount is required");
  }

  const userId = user.userId;

  const userDoc = await userRepository.getDocById(userId);
  if (!userDoc) throw new NotFoundError("User");

  const userData = userDoc as any;

  try {
    // Call Fraud Detector AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/fraud-detector`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
      },
      body: JSON.stringify({
        transactionId,
        type: "withdrawal",
        amount,
        userHistory: {
          accountAge: userData.createdAt
            ? Math.floor(
                (Date.now() - new Date(userData.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
          chargebacks: userData.chargebackCount || 0,
          disputes: userData.disputeCount || 0,
          fraudFlags: userData.fraudFlags || [],
          previousWithdrawals: userData.totalWithdrawn || 0,
          averageWithdrawal: userData.averageWithdrawl || 0,
          jobsCompleted: userData.jobsCompleted || 0,
          accountRating: userData.rating || 0,
        },
      }),
    });

    if (!response.ok) {
      console.error("[Fraud Handler] AI agent failed:", response.status);
      throw new Error("Fraud detection service failed");
    }

    const aiResult = await response.json();
    const decision = aiResult.decision;

    // If fraud risk is HIGH: Block and queue for review
    if (decision.shouldBlock) {
      // Record fraud decision
      const fraudDecision = await AIDecisionService.createDecision({
        type: "PAYOUT",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: "high",
        recommendation: `Fraud detected - payout blocked. Reasons: ${decision.reasons?.join(", ") || "Unknown"}`,
        supportingEvidence: {
          fraudScore: decision.riskScore,
          behavioralFlags: decision.fraudIndicators,
        },
        relatedEntityType: "payout",
        relatedEntityId: transactionId,
      });

      // Update user fraud flag (for future detection)
      const currentFlags: string[] = userData.fraudFlags || [];
      if (!currentFlags.includes("blocked_payout")) {
        await userRepository.updateById(userId, {
          fraudFlags: [...currentFlags, "blocked_payout"],
        });
      }

      return NextResponse.json(
        {
          success: false,
          blocked: true,
          message: "Transaction blocked due to fraud risk",
          decision: {
            status: "blocked",
            riskScore: decision.riskScore,
            riskLevel: "high",
            reasons: decision.reasons,
            aiDecisionId: fraudDecision._id,
          },
        },
        { status: 403 }
      );
    }

    // If MEDIUM risk: Queue for founder review but allow transaction
    if (decision.riskLevel === "medium") {
      await AIDecisionService.createDecision({
        type: "PAYOUT",
        agentName: "support_agent",
        confidenceScore: decision.confidence,
        riskLevel: "medium",
        recommendation: `Medium fraud risk - payout flagged for review. Reasons: ${decision.reasons?.join(", ") || "Unknown"}`,
        supportingEvidence: {
          fraudScore: decision.riskScore,
          behavioralFlags: decision.fraudIndicators,
        },
        relatedEntityType: "payout",
        relatedEntityId: transactionId,
      });

      // Return approval with warning
      return NextResponse.json({
        success: true,
        approved: true,
        flagged: true,
        message: "Transaction approved but flagged for review",
        decision: {
          status: "approved_flagged",
          riskScore: decision.riskScore,
          riskLevel: "medium",
          reasons: decision.reasons,
        },
      });
    }

    // If LOW risk: Auto-approve
    await AIDecisionService.createDecision({
      type: "PAYOUT",
      agentName: "support_agent",
      confidenceScore: decision.confidence,
      riskLevel: "low",
      recommendation: `Payout verified - low fraud risk`,
      supportingEvidence: {
        fraudScore: decision.riskScore,
      },
      relatedEntityType: "payout",
      relatedEntityId: transactionId,
    });

    return NextResponse.json({
      success: true,
      approved: true,
      message: "Transaction verified and approved",
      decision: {
        status: "approved",
        riskScore: decision.riskScore,
        riskLevel: "low",
      },
    });
  } catch (error) {
    console.error("[Fraud Handler] Error:", error);
    // On error, we DON'T block - let transaction proceed with warning
    // The AI system is advisory, not absolute control
    return NextResponse.json(
      {
        success: true,
        approved: true,
        warning: "Fraud check service unavailable, proceeding with caution",
      },
      { status: 200 }
    );
  }
});
