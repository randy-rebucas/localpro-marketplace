/**
 * Reject a specific decision
 * POST /api/admin/approval-queue/[id]/reject
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";

export const POST = withHandler(async (req: NextRequest, ctx) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");

  try {
    const params = await ctx.params;
    const body = await req.json();

    if (!body.reason || body.reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Rejection reason is required (min 5 characters)" },
        { status: 400 }
      );
    }

    const decision = await AIDecisionService.rejectDecision(
      params.id,
      user.userId,
      body.reason
    );

    // Record feedback for retraining
    await AIDecisionService.recordFeedback(params.id, {
      wasCorrect: false,
      userOverride: true,
      overrideReason: body.reason,
    });

    return NextResponse.json({
      data: decision,
      message: "Decision rejected",
    });
  } catch (error) {
    console.error("[Approval Queue reject] error:", error);
    return NextResponse.json(
      { error: "Failed to reject decision" },
      { status: 500 }
    );
  }
});
