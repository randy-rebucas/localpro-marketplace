import {
  jobRepository,
  transactionRepository,
  activityRepository,
} from "@/repositories";
import { canTransition, canTransitionEscrow } from "@/lib/jobLifecycle";
import { calculateCommission } from "@/lib/commission";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export class EscrowService {
  async fundEscrow(user: TokenPayload, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.escrowStatus = "funded";
    await jobDoc.save();

    const { commission, netAmount } = calculateCommission(job.budget);
    const transaction = await transactionRepository.create({
      jobId: job._id,
      payerId: user.userId,
      payeeId: job.providerId,
      amount: job.budget,
      commission,
      netAmount,
      status: "pending",
    });

    await activityRepository.log({
      userId: user.userId,
      eventType: "escrow_funded",
      jobId: job._id!.toString(),
      metadata: { amount: job.budget },
    });

    return { job, transaction };
  }

  async releaseEscrow(user: TokenPayload, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    if (job.status !== "completed") {
      throw new UnprocessableError("Job must be marked as completed by the provider first");
    }

    const check = canTransitionEscrow(job, "released");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.escrowStatus = "released";
    await jobDoc.save();

    await transactionRepository.setPending(job._id!.toString(), "completed");

    await activityRepository.log({
      userId: user.userId,
      eventType: "escrow_released",
      jobId: job._id!.toString(),
    });

    return { job };
  }

  async markJobComplete(user: TokenPayload, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      providerId: { toString(): string } | null;
      save(): Promise<void>;
    };

    if (job.providerId?.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransition(job as unknown as IJob, "completed");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    job.status = "completed";
    await jobDoc.save();

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_completed",
      jobId: job._id!.toString(),
    });

    return { job };
  }
}

export const escrowService = new EscrowService();
