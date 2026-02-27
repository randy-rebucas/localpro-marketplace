import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { ValidationError, NotFoundError, UnprocessableError } from "@/lib/errors";
import Job from "@/models/Job";
import Transaction from "@/models/Transaction";
import { calculateCommission } from "@/lib/commission";
import { activityRepository, notificationRepository } from "@/repositories";
import { pushStatusUpdateMany, pushNotification } from "@/lib/events";
import type { IJob } from "@/types";

const OverrideSchema = z.object({
  action: z.enum(["release", "refund"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { action, reason } = parsed.data;

  await connectDB();
  const jobDoc = await Job.findById(id);
  if (!jobDoc) throw new NotFoundError("Job");

  const job = jobDoc as unknown as IJob & { save(): Promise<void> };

  if (job.escrowStatus !== "funded") {
    throw new UnprocessableError("Escrow must be in 'funded' state to override");
  }

  if (action === "release") {
    job.escrowStatus = "released";
    if (job.status !== "completed") job.status = "completed";
    await jobDoc.save();

    // Ensure a transaction record exists (for non-PayMongo or edge cases)
    const existingTxn = await Transaction.findOne({ jobId: id });
    if (!existingTxn && job.providerId) {
      const { commission, netAmount } = calculateCommission(job.budget);
      await Transaction.create({
        jobId: job._id,
        payerId: job.clientId,
        payeeId: job.providerId,
        amount: job.budget,
        commission,
        netAmount,
        status: "completed",
      });
    } else if (existingTxn) {
      await Transaction.findByIdAndUpdate(existingTxn._id, { status: "completed" });
    }

    const notifBase = { data: { jobId: id }, type: "escrow_released" as const };
    const clientNote = await notificationRepository.create({
      userId: job.clientId.toString(),
      ...notifBase,
      title: "Escrow released by admin",
      message: `Payment for your job has been released by an admin. Reason: ${reason}`,
    });
    pushNotification(job.clientId.toString(), clientNote);

    if (job.providerId) {
      const providerNote = await notificationRepository.create({
        userId: job.providerId.toString(),
        ...notifBase,
        title: "Payment released",
        message: `Escrow payment has been released to you by admin. Reason: ${reason}`,
      });
      pushNotification(job.providerId.toString(), providerNote);
    }
  } else {
    // refund
    job.escrowStatus = "refunded";
    job.status = "refunded";
    await jobDoc.save();

    await Transaction.updateMany(
      { jobId: id },
      { status: "refunded" }
    );

    const clientNote = await notificationRepository.create({
      userId: job.clientId.toString(),
      type: "payment_confirmed",
      title: "Escrow refunded by admin",
      message: `Your escrow payment has been refunded by admin. Reason: ${reason}`,
      data: { jobId: id },
    });
    pushNotification(job.clientId.toString(), clientNote);
  }

  await activityRepository.log({
    userId: user.userId,
    eventType: "escrow_released",
    jobId: id,
    metadata: { adminOverride: true, action, reason },
  });

  const participants = [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[];
  pushStatusUpdateMany(participants, {
    entity: "job",
    id,
    escrowStatus: action === "release" ? "released" : "refunded",
    status: action === "release" ? "completed" : "refunded",
  });

  return NextResponse.json({ message: `Escrow ${action}d successfully` });
});
