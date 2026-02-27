import { jobRepository, quoteRepository, transactionRepository, activityRepository, reviewRepository, disputeRepository } from "@/repositories";
import { payoutRepository } from "@/repositories/payout.repository";
import { notificationService } from "@/services/notification.service";
import { pushStatusUpdate, pushStatusUpdateMany } from "@/lib/events";
import type { JobDocument } from "@/models/Job";
import type { QuoteDocument } from "@/models/Quote";
import type { DisputeDocument } from "@/models/Dispute";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CronService {
  /**
   * Marks open jobs older than `days` as expired and notifies their clients.
   * Runs daily. Default threshold: 30 days.
   */
  async expireStaleJobs(days = 30): Promise<{ expired: number }> {
    const cutoff = daysAgo(days);
    const staleJobs = await jobRepository.findStaleOpen(cutoff);
    if (staleJobs.length === 0) return { expired: 0 };

    for (const job of staleJobs) {
      const j = job as unknown as JobDocument & { _id: { toString(): string }; clientId: { toString(): string }; title: string };
      await jobRepository.updateMany({ _id: j._id } as never, { status: "expired" });

      await activityRepository.log({
        userId: "system",
        eventType: "job_expired",
        jobId: j._id.toString(),
        metadata: { daysOpen: days },
      });

      await notificationService.push({
        userId: j.clientId.toString(),
        type: "job_expired",
        title: "Job listing expired",
        message: `Your job "${j.title}" expired after ${days} days with no accepted quote. You can repost it anytime.`,
        data: { jobId: j._id.toString() },
      });

      pushStatusUpdate(j.clientId.toString(), { entity: "job", id: j._id.toString(), status: "expired" });
    }

    return { expired: staleJobs.length };
  }

  /**
   * Releases escrow for completed jobs older than `days` where payment hasn't been manually released.
   * Runs daily. Default threshold: 7 days.
   */
  async releaseStaleEscrow(days = 7): Promise<{ released: number }> {
    const cutoff = daysAgo(days);
    const jobs = await jobRepository.findCompletedPendingRelease(cutoff);
    if (jobs.length === 0) return { released: 0 };

    for (const job of jobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        title: string;
        budget: number;
      };

      // Release escrow + mark transaction completed
      await jobRepository.updateMany({ _id: j._id } as never, { escrowStatus: "released" });
      await transactionRepository.setPending(j._id.toString(), "completed");

      await activityRepository.log({
        userId: "system",
        eventType: "escrow_released",
        jobId: j._id.toString(),
        metadata: { autoReleased: true, daysAfterCompletion: days },
      });

      // Notify provider
      if (j.providerId) {
        await notificationService.push({
          userId: j.providerId.toString(),
          type: "escrow_auto_released",
          title: "Payment released",
          message: `₱${j.budget.toLocaleString()} has been automatically released to your account for "${j.title}".`,
          data: { jobId: j._id.toString() },
        });
      }

      // Notify client
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "escrow_auto_released",
        title: "Escrow auto-released",
        message: `Payment for "${j.title}" was automatically released to the provider after ${days} days.`,
        data: { jobId: j._id.toString() },
      });

      pushStatusUpdateMany(
        [j.clientId.toString(), j.providerId?.toString()].filter(Boolean) as string[],
        { entity: "job", id: j._id.toString(), escrowStatus: "released" }
      );
    }

    return { released: jobs.length };
  }

  /**
   * Rejects pending quotes older than `days` and notifies providers.
   * Runs daily. Default threshold: 7 days.
   */
  async expireStaleQuotes(days = 7): Promise<{ expired: number }> {
    const cutoff = daysAgo(days);
    const staleQuotes = await quoteRepository.findStale(cutoff);
    if (staleQuotes.length === 0) return { expired: 0 };

    // Bulk-reject all stale quotes at once
    const staleIds = staleQuotes.map((q) => (q as unknown as { _id: { toString(): string } })._id);
    await quoteRepository.updateMany(
      { _id: { $in: staleIds } } as never,
      { status: "rejected" }
    );

    // Notify each provider individually
    for (const quote of staleQuotes) {
      const q = quote as unknown as QuoteDocument & {
        _id: { toString(): string };
        providerId: { toString(): string };
        jobId: { toString(): string };
      };

      await notificationService.push({
        userId: q.providerId.toString(),
        type: "quote_expired",
        title: "Quote expired",
        message: `Your quote was automatically closed after ${days} days with no response from the client.`,
        data: { jobId: q.jobId.toString(), quoteId: q._id.toString() },
      });

      pushStatusUpdate(q.providerId.toString(), { entity: "quote", id: q._id.toString(), status: "rejected" });
    }

    return { expired: staleQuotes.length };
  }

  /**
   * Sends in-app reminders for actionable stale states:
   *  - Clients who haven't funded escrow > 24 hours after quote acceptance
   *  - Clients whose job has been open > 3 days with no quotes yet
   *  - Providers who haven't started a funded job > 48 hours after assignment
   *  - Providers whose job has been in_progress > 7 days without completion
   *  - Clients who haven't left a review > 24 hours after escrow release
   *  - Admins when a dispute has been open/investigating > 5 days
   */
  async sendReminders(): Promise<{
    escrowReminders: number;
    noQuoteReminders: number;
    startJobReminders: number;
    completeJobReminders: number;
    reviewReminders: number;
    disputeEscalations: number;
  }> {
    // ── Escrow funding reminders (assigned but unfunded > 24h) ──────────────
    const unfundedCutoff = hoursAgo(24);
    const unfundedJobs = await jobRepository.findAssignedUnfunded(unfundedCutoff);

    for (const job of unfundedJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        title: string;
      };

      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_fund_escrow",
        title: "Action needed: Fund escrow",
        message: `Your job "${j.title}" has an accepted provider waiting. Please fund escrow to get started.`,
        data: { jobId: j._id.toString() },
      });
    }

    // ── No-quotes reminders (open > 3 days with 0 quotes) ──────────────────
    const noQuoteCutoff = daysAgo(3);
    const staleOpenJobs = await jobRepository.findStaleOpen(noQuoteCutoff);

    let noQuoteCount = 0;
    for (const job of staleOpenJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        title: string;
      };

      const quotes = await quoteRepository.findForJob(j._id.toString());
      if (quotes.length > 0) continue;

      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_no_quotes",
        title: "No quotes yet on your job",
        message: `Your job "${j.title}" has been open for 3+ days with no quotes. Consider adjusting the budget or description.`,
        data: { jobId: j._id.toString() },
      });

      noQuoteCount++;
    }

    // ── Start-job reminders (assigned + funded > 48h, not started) ──────────
    const startJobCutoff = hoursAgo(48);
    const fundedNotStarted = await jobRepository.findAssignedFundedNotStarted(startJobCutoff);

    for (const job of fundedNotStarted) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        providerId: { toString(): string } | null;
        title: string;
      };
      if (!j.providerId) continue;

      await notificationService.push({
        userId: j.providerId.toString(),
        type: "reminder_start_job",
        title: "Reminder: start your job",
        message: `The client has funded escrow for "${j.title}". Please begin work and mark the job as started.`,
        data: { jobId: j._id.toString() },
      });
    }

    // ── Complete-job reminders (in_progress > 7 days) ───────────────────────
    const completeJobCutoff = daysAgo(7);
    const staleInProgress = await jobRepository.findStaleInProgress(completeJobCutoff);

    for (const job of staleInProgress) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        providerId: { toString(): string } | null;
        title: string;
      };
      if (!j.providerId) continue;

      await notificationService.push({
        userId: j.providerId.toString(),
        type: "reminder_complete_job",
        title: "Reminder: mark your job as complete",
        message: `"${j.title}" has been in progress for over 7 days. Please mark it as complete once finished.`,
        data: { jobId: j._id.toString() },
      });
    }

    // ── Review reminders (escrow released > 24h, no review yet) ───────────
    const reviewCutoff = hoursAgo(24);
    const releasedJobs = await jobRepository.findReleasedUnreviewed(reviewCutoff);

    let reviewCount = 0;
    for (const job of releasedJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        title: string;
      };

      const reviewed = await reviewRepository.existsForJob(j._id.toString());
      if (reviewed) continue;

      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_leave_review",
        title: "How did it go? Leave a review",
        message: `Your job "${j.title}" is complete. Take a moment to rate your provider — it helps the community.`,
        data: { jobId: j._id.toString() },
      });

      reviewCount++;
    }

    // ── Stale-dispute escalations (open/investigating > 5 days) ────────────
    const disputeCutoff = daysAgo(5);
    const staleDisputes = await disputeRepository.findStale(disputeCutoff);

    for (const dispute of staleDisputes) {
      const d = dispute as unknown as DisputeDocument & {
        _id: { toString(): string };
        jobId: { toString(): string; title?: string } | { _id: { toString(): string }; title: string };
        status: string;
      };
      const disputeId = d._id.toString();
      const jobTitle =
        typeof d.jobId === "object" && "title" in d.jobId
          ? (d.jobId as { title: string }).title
          : "a job";

      await notificationService.notifyAdmins(
        "reminder_stale_dispute",
        "Dispute needs attention",
        `A dispute on "${jobTitle}" has been ${d.status} for over 5 days with no resolution.`,
        { disputeId }
      );
    }

    return {
      escrowReminders: unfundedJobs.length,
      noQuoteReminders: noQuoteCount,
      startJobReminders: fundedNotStarted.length,
      completeJobReminders: staleInProgress.length,
      reviewReminders: reviewCount,
      disputeEscalations: staleDisputes.length,
    };
  }

  /**
   * Auto-rejects payout requests that have been pending for more than `days` days.
   * Notifies the provider so they can resubmit. Default threshold: 7 days.
   */
  async expireStalePendingPayouts(days = 7): Promise<{ expired: number }> {
    const cutoff = daysAgo(days);
    const stalePayout = await payoutRepository.findStalePending(cutoff);
    if (stalePayout.length === 0) return { expired: 0 };

    for (const payout of stalePayout) {
      const p = payout as unknown as {
        _id: { toString(): string };
        providerId: { toString(): string };
        amount: number;
      };

      await payoutRepository.updateById(p._id.toString(), {
        status: "rejected",
        notes: `Automatically rejected after ${days} days with no admin action.`,
      });

      await activityRepository.log({
        userId: "system",
        eventType: "payout_updated",
        metadata: { payoutId: p._id.toString(), status: "rejected", autoExpired: true },
      });

      await notificationService.push({
        userId: p.providerId.toString(),
        type: "payout_status_update",
        title: "Payout request expired",
        message: `Your payout request of ₱${p.amount.toLocaleString()} was automatically closed after ${days} days. Please resubmit if you still wish to withdraw.`,
        data: { payoutId: p._id.toString() },
      });
    }

    return { expired: stalePayout.length };
  }
}

export const cronService = new CronService();
