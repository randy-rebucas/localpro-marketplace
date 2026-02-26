import {
  disputeRepository,
  jobRepository,
  transactionRepository,
  activityRepository,
} from "@/repositories";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export interface OpenDisputeInput {
  jobId: string;
  reason: string;
}

export interface ResolveDisputeInput {
  status: "investigating" | "resolved";
  resolutionNotes?: string;
  escrowAction?: "release" | "refund";
}

export class DisputeService {
  async listDisputes(user: TokenPayload) {
    const filter =
      user.role === "admin" ? {} : { raisedBy: user.userId };
    return disputeRepository.findWithPopulation(filter as never);
  }

  async openDispute(user: TokenPayload, input: OpenDisputeInput) {
    const jobDoc = await jobRepository.getDocById(input.jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    const isClient = job.clientId.toString() === user.userId;
    const isProvider = job.providerId?.toString() === user.userId;
    if (!isClient && !isProvider) throw new ForbiddenError();

    if (!["assigned", "in_progress", "completed"].includes(job.status)) {
      throw new UnprocessableError("Disputes can only be raised on active jobs");
    }

    const dispute = await disputeRepository.create({
      jobId: input.jobId,
      raisedBy: user.userId,
      reason: input.reason,
    });

    job.status = "disputed";
    await jobDoc.save();

    await activityRepository.log({
      userId: user.userId,
      eventType: "dispute_opened",
      jobId: input.jobId,
    });

    return dispute;
  }

  async getDispute(disputeId: string) {
    const dispute = await disputeRepository.findByIdPopulated(disputeId);
    if (!dispute) throw new NotFoundError("Dispute");
    return dispute;
  }

  async resolveDispute(adminUserId: string, disputeId: string, input: ResolveDisputeInput) {
    const disputeDoc = await disputeRepository.getDocById(disputeId);
    if (!disputeDoc) throw new NotFoundError("Dispute");

    const d = disputeDoc as unknown as {
      status: string;
      resolutionNotes: string;
      jobId: { toString(): string };
      save(): Promise<void>;
    };

    d.status = input.status;
    if (input.resolutionNotes) d.resolutionNotes = input.resolutionNotes;
    await disputeDoc.save();

    // Handle escrow action on resolution
    if (input.status === "resolved" && input.escrowAction) {
      const jobDoc = await jobRepository.getDocById(d.jobId.toString());
      if (jobDoc) {
        const job = jobDoc as unknown as IJob & { save(): Promise<void> };
        if (input.escrowAction === "release") {
          job.escrowStatus = "released";
          await transactionRepository.setPending(job._id!.toString(), "completed");
        } else {
          job.escrowStatus = "refunded";
          job.status = "refunded";
          await transactionRepository.setPending(job._id!.toString(), "refunded");
        }
        await jobDoc.save();
      }
    }

    await activityRepository.log({
      userId: adminUserId,
      eventType: "dispute_resolved",
      jobId: d.jobId.toString(),
    });

    return disputeDoc;
  }
}

export const disputeService = new DisputeService();
