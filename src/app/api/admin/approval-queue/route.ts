/**
 * Approval Queue API
 * GET /api/admin/approval-queue — Fetch pending AI decisions
 * POST /api/admin/approval-queue/[id]/approve — Approve a decision
 * POST /api/admin/approval-queue/[id]/reject — Reject a decision
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";
import { enqueueNotification } from "@/lib/notification-queue";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/admin/approval-queue
 * Fetch pending decisions with filters
 */
export const GET = withHandler(async (req: NextRequest) => {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "pending_review") as any;
  const riskLevel = searchParams.get("riskLevel") as any;
  const agentName = searchParams.get("agentName") as any;
  const type = searchParams.get("type") as any;
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const skip = parseInt(searchParams.get("skip") || "0");
  const sortBy = (searchParams.get("sortBy") || "createdAt") as any;

  try {
    // Fetch decisions
    const { decisions, total } = await AIDecisionService.getPendingDecisions({
      status,
      riskLevel: riskLevel ? riskLevel.split(",") : undefined,
      agentName,
      type,
      limit,
      skip,
      sortBy,
    });

    // Get summary
    const summary = await AIDecisionService.getApprovalDashboardSummary();

    return NextResponse.json({
      data: decisions,
      pagination: {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("[Approval Queue GET] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/approval-queue/[id]
 * Fetch a single decision with full details
 */
export async function getDecision(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const decision = await AIDecisionService.getDecision(params.id);

    if (!decision) {
      return NextResponse.json(
        { error: "Decision not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: decision });
  } catch (error) {
    console.error("[Approval Queue GET single] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decision" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/approval-queue/[id]/approve
 * Approve a decision
 */
export async function approveDecision(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const { notes, executeAction } = body;

    const decision = await AIDecisionService.approveDecision(
      params.id,
      user.userId,
      executeAction ? async () => {
        // Execute the actual action (e.g., publish job, release escrow, send support response)
        // This callback should be implemented based on decision type
        console.log(`[Approval] Executing action for decision ${params.id}`);
      } : undefined
    );

    // Record feedback
    if (notes) {
      await AIDecisionService.recordFeedback(params.id, {
        wasCorrect: true,
        userNotes: notes,
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
}

/**
 * POST /api/admin/approval-queue/[id]/reject
 * Reject a decision
 */
export async function rejectDecision(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Rejection reason is required (min 5 characters)" },
        { status: 400 }
      );
    }

    const decision = await AIDecisionService.rejectDecision(
      params.id,
      user.userId,
      reason
    );

    // Record feedback for retraining
    await AIDecisionService.recordFeedback(params.id, {
      wasCorrect: false,
      userOverride: true,
      overrideReason: reason,
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
}

/**
 * POST /api/admin/approval-queue/[id]/escalate
 * Escalate a decision to urgent
 */
export async function escalateDecision(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const { reason } = body;

    const decision = await AIDecisionService.escalateDecision(
      params.id,
      reason || "Escalated to urgent"
    );

    return NextResponse.json({
      data: decision,
      message: "Decision escalated to urgent",
    });
  } catch (error) {
    console.error("[Approval Queue escalate] error:", error);
    return NextResponse.json(
      { error: "Failed to escalate decision" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/approval-queue/bulk-approve
 * Approve multiple decisions at once
 */
export async function bulkApprove(req: NextRequest) {
  await connectDB();
  const user = await requireUser();
  requireCapability(user, "manage_operations");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const { decisionIds } = body;

    if (!Array.isArray(decisionIds) || decisionIds.length === 0) {
      return NextResponse.json(
        { error: "decisionIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      decisionIds.map((id) =>
        AIDecisionService.approveDecision(id, user.userId)
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      message: `Bulk approval: ${successful} succeeded, ${failed} failed`,
      successCount: successful,
      failureCount: failed,
    });
  } catch (error) {
    console.error("[Approval Queue bulk-approve] error:", error);
    return NextResponse.json(
      { error: "Failed to bulk approve decisions" },
      { status: 500 }
    );
  }
}
