/**
 * Approve a specific decision
 * POST /api/admin/approval-queue/[id]/approve
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";

import { checkRateLimit } from "@/lib/rateLimit";
export const POST = withHandler(async (req: NextRequest, ctx) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const params = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const decision = await AIDecisionService.approveDecision(params.id, user.userId);

    // Record feedback
    if (body.notes) {
      await AIDecisionService.recordFeedback(params.id, {
        wasCorrect: true,
        userNotes: body.notes,
      });
    }

    return NextResponse.json({
      data: decision,
      message: "Decision approved successfully",
    });
  } catch (error) {
    console.error("[Approval Queue approve] error:", error);
    return NextResponse.json(
      { error: "Failed to approve decision" },
      { status: 500 }
    );
  }
});
