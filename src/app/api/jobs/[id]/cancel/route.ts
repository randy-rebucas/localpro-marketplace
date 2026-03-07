import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, NotFoundError, UnprocessableError, ValidationError } from "@/lib/errors";
import { canTransition } from "@/lib/jobLifecycle";
import {
  jobRepository,
  activityRepository,
  notificationRepository,
  quoteRepository,
  paymentRepository,
} from "@/repositories";
import { pushStatusUpdateMany, pushNotification } from "@/lib/events";
import type { IJob } from "@/types";

const CancelSchema = z.object({
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

/**
 * POST /api/jobs/:id/cancel
 *
 * Client-initiated job closure. Allowed when:
 *   - status = "open"            → no provider involved, just cancel
 *   - status = "assigned"        → provider accepted but not yet started
 *                                  (escrow refunded automatically if already funded)
 *
 * NOT allowed once in_progress or beyond — use dispute flow instead.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { reason } = parsed.data;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    save(): Promise<void>;
  };

  // Only the job's client can cancel
  if (job.clientId.toString() !== user.userId) {
    throw new ForbiddenError("Only the job owner can cancel this job");
  }

  // Guard: only open or assigned jobs can be cancelled
  if (!["open", "assigned"].includes(job.status)) {
    throw new UnprocessableError(
      `Cannot cancel a job with status "${job.status}". Jobs that are already in progress must be handled via a dispute.`
    );
  }

  // Validate lifecycle transition
  const check = canTransition(job as unknown as IJob, "cancelled");
  if (!check.allowed) {
    throw new UnprocessableError(check.reason ?? "Cannot cancel this job");
  }

  const previousProviderId = job.providerId?.toString() ?? null;
  const hadFundedEscrow = job.escrowStatus === "funded";

  // Cancel the job
  (job as unknown as { status: string }).status = "cancelled";

  // If escrow was funded, mark it as refunded on the job record
  if (hadFundedEscrow) {
    (job as unknown as { escrowStatus: string }).escrowStatus = "refunded";
  }

  await jobDoc.save();

  // If escrow was funded, credit the client's wallet instead of reversing via PayMongo
  if (hadFundedEscrow) {
    const { walletService } = await import("@/services/wallet.service");
    await walletService.credit(
      user.userId,
      (job as unknown as { budget: number }).budget,
      `Refund — job cancelled`,
      { jobId: id, silent: true }
    );
    await paymentRepository.markRefundedByJobId(id);
  }

  // Reject all pending/accepted quotes for this job (open = multiple providers, assigned = one)
  await quoteRepository.rejectAllPending(id);

  // Activity log
  await activityRepository.log({
    userId:    user.userId,
    eventType: "job_cancelled" as never,
    jobId:     id,
    metadata:  { reason, hadFundedEscrow, previousProviderId },
  });

  // Notify assigned provider (if any)
  if (previousProviderId) {
    const note = await notificationRepository.create({
      userId:  previousProviderId,
      type:    "job_update" as never,
      title:   "Job cancelled by client",
      message: `The client has cancelled the job you were assigned to. Reason: ${reason}`,
      data:    { jobId: id },
    });
    pushNotification(previousProviderId, note);
  }

  // Realtime update to all affected parties
  const affected = [user.userId, previousProviderId].filter(Boolean) as string[];
  pushStatusUpdateMany(affected, { entity: "job", id, status: "cancelled" });

  return NextResponse.json({
    message: hadFundedEscrow
      ? "Job cancelled. Your escrow payment will be refunded."
      : "Job cancelled successfully.",
  });
});
