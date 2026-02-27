import {
  disputeRepository,
  jobRepository,
  transactionRepository,
  activityRepository,
  notificationRepository,
} from "@/repositories";
import { pushNotification, pushStatusUpdateMany } from "@/lib/events";
import { NotFoundError, ForbiddenError, UnprocessableError } from "@/lib/errors";
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
    const filter = user.role === "admin" ? {} : { raisedBy: user.userId };
    return disputeRepository.findWithPopulation(filter as never);
  }

  async openDispute(user: TokenPayload, input: OpenDisputeInput) {
    const jobDoc = await jobRepository.getDocById(input.jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      clientId: { toString(): string };
      providerId?: { toString(): string } | null;
      save(): Promise<void>;
    };

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

    // Notify the other party
    const otherPartyId = isClient ? job.providerId?.toString() : job.clientId.toString();
    if (otherPartyId) {
      const notification = await notificationRepository.create({
        userId: otherPartyId,
        type: "dispute_opened",
        title: "A dispute has been opened",
        message: "A dispute was raised on one of your jobs. An admin will review it.",
        data: { jobId: input.jobId, disputeId: dispute._id!.toString() },
      });
      pushNotification(otherPartyId, notification);
    }

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: input.jobId, status: "disputed" }
    );

    return dispute;
  }

  async getDispute(disputeId: string) {
    const dispute = await disputeRepository.findByIdPopulated(disputeId);
    if (!dispute) throw new NotFoundError("Dispute");
    return dispute;
  }

  async resolveDispute(
    adminUserId: string,
    disputeId: string,
    input: ResolveDisputeInput
  ) {
    const disputeDoc = await disputeRepository.getDocById(disputeId);
    if (!disputeDoc) throw new NotFoundError("Dispute");

    const d = disputeDoc as unknown as {
      status: string;
      resolutionNotes: string;
      jobId: { toString(): string };
      raisedBy: { toString(): string };
      save(): Promise<void>;
    };

    d.status = input.status;
    if (input.resolutionNotes) d.resolutionNotes = input.resolutionNotes;
    await disputeDoc.save();

    const jobDoc = await jobRepository.getDocById(d.jobId.toString());
    if (jobDoc && input.status === "resolved" && input.escrowAction) {
      const job = jobDoc as unknown as IJob & {
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        save(): Promise<void>;
      };

      if (input.escrowAction === "release") {
        job.escrowStatus = "released";
        await transactionRepository.setPending(job._id!.toString(), "completed");
      } else {
        job.escrowStatus = "refunded";
        job.status = "refunded";
        await transactionRepository.setPending(job._id!.toString(), "refunded");

        // Issue PayMongo refund if applicable
        const { paymentService } = await import("@/services/payment.service");
        await paymentService.refundEscrow(
          job._id!.toString(),
          "requested_by_customer"
        );
      }
      await jobDoc.save();

      // Notify both parties
      const recipients = [
        job.clientId.toString(),
        job.providerId?.toString(),
      ].filter(Boolean) as string[];

      for (const userId of recipients) {
        const notification = await notificationRepository.create({
          userId,
          type: "dispute_resolved",
          title: "Dispute resolved",
          message:
            input.escrowAction === "release"
              ? "The dispute was resolved. Payment has been released to the provider."
              : "The dispute was resolved. A refund has been issued.",
          data: { jobId: d.jobId.toString(), disputeId },
        });
        pushNotification(userId, notification);
      }
    }

    await activityRepository.log({
      userId: adminUserId,
      eventType: "dispute_resolved",
      jobId: d.jobId.toString(),
    });

    // Push realtime updates to both parties
    if (jobDoc && input.status === "resolved") {
      const job2 = jobDoc as unknown as {
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        status: string;
        escrowStatus: string;
        _id: { toString(): string };
      };
      const affected = [job2.clientId.toString(), job2.providerId?.toString()].filter(Boolean) as string[];
      pushStatusUpdateMany(affected, {
        entity: "job",
        id: job2._id.toString(),
        status: job2.status,
        escrowStatus: job2.escrowStatus,
      });
      pushStatusUpdateMany(affected, { entity: "dispute", id: disputeId });
    }

    return disputeDoc;
  }
}

export const disputeService = new DisputeService();
