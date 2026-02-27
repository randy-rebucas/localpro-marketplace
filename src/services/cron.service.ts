import { jobRepository, quoteRepository, transactionRepository, activityRepository } from "@/repositories";
import { notificationService } from "@/services/notification.service";
import { pushStatusUpdate, pushStatusUpdateMany } from "@/lib/events";
import type { JobDocument } from "@/models/Job";
import type { QuoteDocument } from "@/models/Quote";

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
   */
  async sendReminders(): Promise<{ escrowReminders: number; noQuoteReminders: number }> {
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

    // Filter to only jobs that truly have no quotes yet
    let noQuoteCount = 0;
    for (const job of staleOpenJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        title: string;
      };

      const quotes = await quoteRepository.findForJob(j._id.toString());
      if (quotes.length > 0) continue; // already has quotes — skip

      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_no_quotes",
        title: "No quotes yet on your job",
        message: `Your job "${j.title}" has been open for 3+ days with no quotes. Consider adjusting the budget or description.`,
        data: { jobId: j._id.toString() },
      });

      noQuoteCount++;
    }

    return {
      escrowReminders: unfundedJobs.length,
      noQuoteReminders: noQuoteCount,
    };
  }
}

export const cronService = new CronService();
