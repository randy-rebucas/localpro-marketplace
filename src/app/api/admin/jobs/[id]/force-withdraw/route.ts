import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, UnprocessableError } from "@/lib/errors";
import { jobRepository, activityRepository, notificationRepository, quoteRepository } from "@/repositories";
import { pushStatusUpdateMany, pushNotification } from "@/lib/events";
import type { IJob } from "@/types";

const ForceWithdrawSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

/**
 * POST /api/admin/jobs/:id/force-withdraw
 *
 * Admin-only. Unassigns a provider from a job and re-opens it to the board.
 * Works on jobs in "assigned" or "in_progress" state, regardless of escrow.
 *
 * Use when the provider is unresponsive, refuses to withdraw, or is otherwise
 * unable to complete the job. The client does NOT need to pay again if escrow
 * is already funded — it stays held for the next assigned provider.
 */
export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = ForceWithdrawSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { reason } = parsed.data;

  const jobDoc = await jobRepository.getDocById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & {
    clientId: { toString(): string };
    providerId?: { toString(): string } | null;
    save(): Promise<void>;
  };

  if (!["assigned", "in_progress"].includes(job.status)) {
    throw new UnprocessableError(
      `Force withdraw is only allowed on assigned or in-progress jobs (current status: ${job.status})`
    );
  }

  if (!job.providerId) {
    throw new UnprocessableError("This job has no assigned provider");
  }

  const previousProviderId = job.providerId.toString();

  // Clear provider and re-open
  (job as unknown as { providerId: null; status: string }).providerId = null;
  (job as unknown as { status: string }).status = "open";
  await jobDoc.save();

  // Reject the provider's accepted/pending quote so it no longer appears accepted
  await quoteRepository.rejectByProvider(id, previousProviderId);

  // Notify client
  const clientNote = await notificationRepository.create({
    userId: job.clientId.toString(),
    type: "job_update" as never,
    title: "Provider removed by admin",
    message: `The provider has been removed from your job by an admin. Your job is now re-opened and accepting new providers. Reason: ${reason}`,
    data: { jobId: id },
  });
  pushNotification(job.clientId.toString(), clientNote);

  // Notify the removed provider
  const providerNote = await notificationRepository.create({
    userId: previousProviderId,
    type: "job_update" as never,
    title: "You have been removed from a job",
    message: `An admin has removed you from a job. Reason: ${reason}`,
    data: { jobId: id },
  });
  pushNotification(previousProviderId, providerNote);

  await activityRepository.log({
    userId: user.userId,
    eventType: "job_started",
    jobId: id,
    metadata: { adminForceWithdraw: true, removedProviderId: previousProviderId, reason },
  });

  pushStatusUpdateMany(
    [job.clientId.toString(), previousProviderId],
    { entity: "job", id, status: "open" }
  );

  return NextResponse.json({ message: "Provider removed. Job has been re-opened." });
});
