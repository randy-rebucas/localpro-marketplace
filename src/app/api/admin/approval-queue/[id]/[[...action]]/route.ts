/**
 * Dynamic route handler for individual approval queue decisions
 * POST /api/admin/approval-queue/[id]/approve
 * POST /api/admin/approval-queue/[id]/reject
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * Approve a specific decision
 * POST /api/admin/approval-queue/[id]/approve
 */
export const POST = withHandler(async (req: NextRequest, ctx) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const params = await ctx.params;
  const [id, action] = params.id;

  if (!id || !["approve", "reject", "escalate"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid approval queue path" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case "approve": {
        const decision = await AIDecisionService.approveDecision(id, user.userId);

        // Record feedback
        if (body.notes) {
          await AIDecisionService.recordFeedback(id, {
            wasCorrect: true,
            userNotes: body.notes,
          });
        }

        return NextResponse.json({
          data: decision,
          message: "Decision approved successfully",
        });
      }

      case "reject": {
        if (!body.reason || body.reason.trim().length < 5) {
          return NextResponse.json(
            { error: "Rejection reason is required (min 5 characters)" },
            { status: 400 }
          );
        }

        const decision = await AIDecisionService.rejectDecision(
          id,
          user.userId,
          body.reason
        );

        // Record feedback for retraining
        await AIDecisionService.recordFeedback(id, {
          wasCorrect: false,
          userOverride: true,
          overrideReason: body.reason,
        });

        return NextResponse.json({
          data: decision,
          message: "Decision rejected",
        });
      }

      case "escalate": {
        const decision = await AIDecisionService.escalateDecision(
          id,
          body.reason || "Escalated by user"
        );

        return NextResponse.json({
          data: decision,
          message: "Decision escalated to urgent",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[Approval Queue ${action}] error:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} decision` },
      { status: 500 }
    );
  }
});
