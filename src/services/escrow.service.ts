import {
  jobRepository,
  transactionRepository,
  activityRepository,
} from "@/repositories";
import { canTransition, canTransitionEscrow } from "@/lib/jobLifecycle";
import { pushStatusUpdateMany } from "@/lib/events";
import { calculateCommission } from "@/lib/commission";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export class EscrowService {
  /** Initiates escrow funding via PayMongo (or simulates if key not set). */
  async fundEscrow(user: TokenPayload, jobId: string) {
    const { paymentService } = await import("@/services/payment.service");
    return paymentService.initiateEscrowPayment(user, jobId);
  }

  async startJob(user: TokenPayload, jobId: string, photos: string[]) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      providerId: { toString(): string } | null;
      clientId: { toString(): string };
      beforePhoto: string[];
      save(): Promise<void>;
    };

    if (job.providerId?.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransition(job as unknown as IJob, "in_progress");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.status = "in_progress";
    job.beforePhoto = [...(Array.isArray(job.beforePhoto) ? job.beforePhoto : []), ...photos].slice(0, 3);
    await jobDoc.save();

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_started",
      jobId: job._id!.toString(),
    });

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: job._id!.toString(), status: "in_progress" }
    );

    return { job };
  }

  async markJobComplete(user: TokenPayload, jobId: string, photos: string[]) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      providerId: { toString(): string } | null;
      clientId: { toString(): string };
      afterPhoto: string[];
      save(): Promise<void>;
    };

    if (job.providerId?.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransition(job as unknown as IJob, "completed");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.status = "completed";
    job.afterPhoto = [...(Array.isArray(job.afterPhoto) ? job.afterPhoto : []), ...photos].slice(0, 3);
    await jobDoc.save();

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_completed",
      jobId: job._id!.toString(),
    });

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: job.clientId.toString(),
      type: "job_completed",
      title: "Job marked as completed",
      message: "The provider has marked the job as done. Please review and release payment.",
      data: { jobId: job._id!.toString() },
    });

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: job._id!.toString(), status: "completed" }
    );

    return { job };
  }

  async releaseEscrow(user: TokenPayload, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      providerId: { toString(): string } | null;
      save(): Promise<void>;
    };

    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    if (job.status !== "completed") {
      throw new UnprocessableError("Job must be marked as completed by the provider first");
    }

    const check = canTransitionEscrow(job as unknown as IJob, "released");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.escrowStatus = "released";
    await jobDoc.save();

    await transactionRepository.setPending(job._id!.toString(), "completed");

    await activityRepository.log({
      userId: user.userId,
      eventType: "escrow_released",
      jobId: job._id!.toString(),
    });

    if (job.providerId) {
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: job.providerId.toString(),
        type: "escrow_released",
        title: "Payment released!",
        message: "The client approved the job. Your payment has been released.",
        data: { jobId: job._id!.toString() },
      });
    }

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: job._id!.toString(), escrowStatus: "released" }
    );

    return { job };
  }
}

export const escrowService = new EscrowService();
