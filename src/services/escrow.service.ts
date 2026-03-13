import {
  jobRepository,
  transactionRepository,
  activityRepository,
  providerProfileRepository,
  quoteRepository,
} from "@/repositories";
import { ledgerService } from "@/services/ledger.service";
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
  async fundEscrow(user: TokenPayload, jobId: string, overrideAmount?: number) {
    const { paymentService } = await import("@/services/payment.service");
    return paymentService.initiateEscrowPayment(user, jobId, overrideAmount);
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

    // Use native-driver path in repository to bypass Mongoose schema casting.
    // Replace (not merge) beforePhoto so client-uploaded job-creation photos
    // don't block the provider from uploading their own start-of-work photos.
    await jobRepository.updateStatusAndPhoto(jobDoc._id.toString(), "in_progress", "beforePhoto", photos);

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

    // Use native-driver path in repository to bypass Mongoose schema casting
    const existing = Array.isArray(job.afterPhoto) ? job.afterPhoto : [];
    const merged = [...existing, ...photos].slice(0, 3);
    await jobRepository.updateStatusAndPhoto(jobDoc._id.toString(), "completed", "afterPhoto", merged);

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

    // Auto-lock the recurring schedule to this provider (first successful run only)
    const recurringId = (job as unknown as { recurringScheduleId?: { toString(): string } | null }).recurringScheduleId;
    if (recurringId && job.providerId) {
      try {
        const { recurringScheduleRepository } = await import("@/repositories");
        const schedule = await recurringScheduleRepository.findById(recurringId.toString());
        if (schedule && !schedule.providerId) {
          await recurringScheduleRepository.setPreferredProvider(
            recurringId.toString(),
            job.providerId.toString()
          );
        }
      } catch {
        // Non-critical — don't fail job completion because of this
      }
    }

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

    // ── update provider performance metrics ──────────────────────────────────
    if (job.providerId) {
      const providerId = job.providerId.toString();
      const [completedCount, totalCount] = await Promise.all([
        jobRepository.countByProvider(providerId, ["completed"]),
        jobRepository.countByProvider(providerId, ["completed", "cancelled", "refunded"]),
      ]);
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
      await providerProfileRepository.updateCompletionStats(providerId, completedCount, completionRate);
    }

    await transactionRepository.setPending(job._id!.toString(), "completed");

    // ── post ledger entry for escrow release ─────────────────────────────────
    try {
      const tx = await transactionRepository.findOneByJobId(job._id!.toString());
      if (tx) {
        const t = tx as unknown as { _id: { toString(): string }; amount: number; commission: number; netAmount: number };
        // Guard: skip ledger write if amounts are missing/invalid (shouldn't happen)
        if (t.amount > 0 && t.commission >= 0 && t.netAmount >= 0) {
          const releaseJournalId = `escrow-release-${job._id!.toString()}`;
          await ledgerService.postEscrowReleased(
            {
              journalId: releaseJournalId,
              entityType: "job",
              entityId: job._id!.toString(),
              clientId: job.clientId.toString(),
              providerId: job.providerId?.toString(),
              initiatedBy: user.userId,
            },
            t.amount, t.commission, t.netAmount
          );
          // Stamp the release journal on the Transaction for end-to-end traceability
          await transactionRepository.updateById(t._id.toString(), { ledgerJournalId: releaseJournalId });
        }
      }
    } catch {
      // Non-critical — do not fail escrow release if ledger write fails
    }

    // ── loyalty points for client ────────────────────────────────────────────
    try {
      const { loyaltyService } = await import("@/services/loyalty.service");
      const acct = await loyaltyService.getAccount(job.clientId.toString());
      const isFirst = acct.lifetimePoints === 0;
      await loyaltyService.awardJobPoints(
        job.clientId.toString(),
        job.budget,
        job._id!.toString(),
        isFirst
      );
    } catch {
      // Non-critical — do not fail escrow release if loyalty fails
    }

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

    // ── Agency staff payout split record ──────────────────────────────────────
    if (job.providerId) {
      try {
        const UserModel = (await import("@/models/User")).default;
        const worker = await UserModel.findById(job.providerId.toString(), "agencyId").lean();

        if (worker?.agencyId) {
          const AgencyProfile = (await import("@/models/AgencyProfile")).default;
          const AgencyStaffPayout = (await import("@/models/AgencyStaffPayout")).default;

          const agency = await AgencyProfile.findById(worker.agencyId).lean();
          if (agency) {
            const staffEntry = agency.staff.find(
              (s: { userId: { toString(): string }; workerSharePct: number }) =>
                s.userId.toString() === job.providerId!.toString()
            );

            const sharePct =
              (staffEntry?.workerSharePct ?? 0) > 0
                ? (staffEntry!.workerSharePct)
                : (agency.defaultWorkerSharePct ?? 60);

            // Determine gross amount from the job transaction
            const tx = await transactionRepository.findOneByJobId(job._id!.toString());
            const grossAmount = (tx as unknown as { netAmount?: number } | null)?.netAmount ?? job.budget;

            const workerAmount = Math.round(grossAmount * (sharePct / 100) * 100) / 100;
            const agencyAmount = Math.round((grossAmount - workerAmount) * 100) / 100;

            await AgencyStaffPayout.create({
              agencyId: agency._id,
              agencyOwnerId: agency.providerId,
              workerId: job.providerId.toString(),
              jobId: job._id!.toString(),
              grossAmount,
              workerAmount,
              agencyAmount,
              workerSharePct: sharePct,
              status: "pending",
            });
          }
        }
      } catch (err) {
        // Non-critical — do not fail escrow release if payout split fails
        console.error("[PAYOUT_SPLIT] Failed to create staff payout record:", err);
      }
    }

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: job._id!.toString(), escrowStatus: "released" }
    );

    return { job };
  }

  /**
   * Allows a provider to withdraw from an assigned (but not yet started) job.
   * The job reverts to "open" so it re-appears on the board. Escrow stays
   * "funded" — the client does NOT need to pay again.
   */
  async withdrawJob(user: TokenPayload, jobId: string, reason: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      providerId: { toString(): string } | null;
      clientId: { toString(): string };
      save(): Promise<void>;
    };

    // Only the assigned provider may withdraw
    if (job.providerId?.toString() !== user.userId) throw new ForbiddenError();

    // Only allowed when job is still in "assigned" state (before start)
    const check = canTransition(job as unknown as IJob, "open");
    if (!check.allowed) {
      throw new UnprocessableError(
        "Can only withdraw from a job that has not been started yet"
      );
    }

    const previousProviderId = job.providerId.toString();

    // Revert to open — clear provider assignment
    job.status = "open";
    job.providerId = null;
    await jobDoc.save();

    // Reject the provider's accepted/pending quote so it no longer shows as accepted
    await quoteRepository.rejectByProvider(job._id!.toString(), previousProviderId);

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_started", // reuse closest event; extend ActivityLog events if needed
      jobId: job._id!.toString(),
      metadata: { action: "provider_withdrawal", reason },
    });

    // Notify the client
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: job.clientId.toString(),
      type: "job_update" as never,
      title: "Provider withdrew from your job",
      message: `Your provider could not proceed with the job. It has been re-opened and is now accepting new providers.`,
      data: { jobId: job._id!.toString() },
    });

    // Push realtime update to both parties
    pushStatusUpdateMany(
      [job.clientId.toString(), previousProviderId],
      { entity: "job", id: job._id!.toString(), status: "open" }
    );

    return { job };
  }
}

export const escrowService = new EscrowService();
