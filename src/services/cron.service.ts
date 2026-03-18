import { jobRepository, quoteRepository, transactionRepository, activityRepository, reviewRepository, disputeRepository, notificationRepository, userRepository } from "@/repositories";
import { payoutRepository } from "@/repositories/payout.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { notificationService } from "@/services/notification.service";
import { pushStatusUpdate, pushStatusUpdateMany } from "@/lib/events";
import { getAppSetting } from "@/lib/appSettings";
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
   * Runs daily. Default threshold: 30 days (configurable via limits.jobExpiryDays).
   */
  async expireStaleJobs(days?: number): Promise<{ expired: number }> {
    const threshold = days ?? (await getAppSetting<number>("limits.jobExpiryDays", 30));
    const cutoff = daysAgo(threshold);
    const staleJobs = await jobRepository.findStaleOpen(cutoff);
    if (staleJobs.length === 0) return { expired: 0 };

    for (const job of staleJobs) {
      const j = job as unknown as JobDocument & { _id: { toString(): string }; clientId: { toString(): string }; title: string };
      await jobRepository.updateMany({ _id: j._id } as never, { status: "expired" });

      await activityRepository.log({
        userId: "system",
        eventType: "job_expired",
        jobId: j._id.toString(),
        metadata: { daysOpen: threshold },
      });

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "job_expired",
        title: t("jobExpiredTitle"),
        message: t("jobExpiredMessage", { jobTitle: j.title, days: threshold }),
        data: { jobId: j._id.toString() },
      });

      pushStatusUpdate(j.clientId.toString(), { entity: "job", id: j._id.toString(), status: "expired" });
    }

    return { expired: staleJobs.length };
  }

  /**
   * Reverts assigned jobs whose escrow was never funded back to "open" status.
   *
   * When a client opens a PayMongo checkout and it expires without payment, the Job
   * stays "assigned" + escrowStatus "not_funded" indefinitely. This cron detects
   * those stale assignments and reopens the job so it can receive new quotes.
   *
   * Runs together with expireStaleJobs. Default threshold: 48 hours.
   */
  async revertStaleAssignments(hours?: number): Promise<{ reverted: number }> {
    const threshold = hours ?? (await getAppSetting<number>("limits.staleAssignmentHours", 48));
    const cutoff = hoursAgo(threshold);
    const staleJobs = await jobRepository.findAssignedUnfunded(cutoff);
    if (staleJobs.length === 0) return { reverted: 0 };

    for (const job of staleJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        title: string;
      };

      // Reset to open and clear assigned provider
      await jobRepository.updateMany(
        { _id: j._id } as never,
        { status: "open", providerId: null }
      );

      // Reject any accepted quotes so providers can re-bid
      await quoteRepository.rejectAllPending(j._id.toString());

      await activityRepository.log({
        userId: "system",
        eventType: "job_reopened" as never,
        jobId: j._id.toString(),
        metadata: { reason: "stale_assignment_unfunded", thresholdHours: threshold },
      });

      // Notify client
      const { getNotificationT: getNotifT } = await import("@/services/notification.service");
      const tClient = await getNotifT(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "job_expired" as never,
        title: tClient("jobReopenedTitle"),
        message: tClient("jobReopenedMessage", { jobTitle: j.title, hours: threshold }),
        data: { jobId: j._id.toString() },
      });

      // Notify the provider that was previously assigned
      if (j.providerId) {
        const tProvider = await getNotifT(j.providerId.toString());
        await notificationService.push({
          userId: j.providerId.toString(),
          type: "job_expired" as never,
          title: tProvider("assignmentCancelledTitle"),
          message: tProvider("assignmentCancelledMessage", { jobTitle: j.title, hours: threshold }),
          data: { jobId: j._id.toString() },
        });
      }

      pushStatusUpdate(j.clientId.toString(), { entity: "job", id: j._id.toString(), status: "open" });
    }

    return { reverted: staleJobs.length };
  }

  /**
   * Releases escrow for completed jobs older than `days` where payment hasn't been manually released.
   * Runs daily. Default threshold: 7 days (configurable via limits.escrowAutoReleaseDays).
   */
  async releaseStaleEscrow(days?: number): Promise<{ released: number }> {
    const threshold = days ?? (await getAppSetting<number>("limits.escrowAutoReleaseDays", 7));
    const cutoff = daysAgo(threshold);
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
        metadata: { autoReleased: true, daysAfterCompletion: threshold },
      });

      // Notify provider
      if (j.providerId) {
        const { getNotificationT: getNotifT } = await import("@/services/notification.service");
        const tProvider = await getNotifT(j.providerId.toString());
        await notificationService.push({
          userId: j.providerId.toString(),
          type: "escrow_auto_released",
          title: tProvider("scheduleReleaseTitle"),
          message: tProvider("scheduleReleaseMessage", { amount: j.budget.toLocaleString(), jobTitle: j.title }),
          data: { jobId: j._id.toString() },
        });
      }

      // Notify client
      const { getNotificationT: getNotifT2 } = await import("@/services/notification.service");
      const tClient = await getNotifT2(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "escrow_auto_released",
        title: tClient("escrowAutoReleasedTitle"),
        message: tClient("escrowAutoReleasedMessage", { jobTitle: j.title, days: threshold }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(q.providerId.toString());
      await notificationService.push({
        userId: q.providerId.toString(),
        type: "quote_expired",
        title: t("quoteExpiredTitle"),
        message: t("quoteExpiredMessage", { days }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_fund_escrow",
        title: t("fundEscrowReminderTitle"),
        message: t("fundEscrowReminderMessage", { jobTitle: j.title }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_no_quotes",
        title: t("noQuotesReminderTitle"),
        message: t("noQuotesReminderMessage", { jobTitle: j.title }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.providerId.toString());
      await notificationService.push({
        userId: j.providerId.toString(),
        type: "reminder_start_job",
        title: t("startJobReminderTitle"),
        message: t("startJobReminderMessage", { jobTitle: j.title }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.providerId.toString());
      await notificationService.push({
        userId: j.providerId.toString(),
        type: "reminder_complete_job",
        title: t("completeJobReminderTitle"),
        message: t("completeJobReminderMessage", { jobTitle: j.title }),
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(j.clientId.toString());
      await notificationService.push({
        userId: j.clientId.toString(),
        type: "reminder_leave_review",
        title: t("reviewReminderTitle"),
        message: t("reviewReminderMessage", { jobTitle: j.title }),
        data: { jobId: j._id.toString() },
      });

      reviewCount++;
    }

    // ── Stale-dispute escalations (configurable via limits.disputeEscalationDays) ──
    const disputeEscalationDays = await getAppSetting<number>("limits.disputeEscalationDays", 5);
    const disputeCutoff = daysAgo(disputeEscalationDays);
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
        `A dispute on "${jobTitle}" has been ${d.status} for over ${disputeEscalationDays} days with no resolution.`,
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

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(p.providerId.toString());
      await notificationService.push({
        userId: p.providerId.toString(),
        type: "payout_status_update",
        title: t("payoutExpiredTitle"),
        message: t("payoutExpiredMessage", { amount: p.amount.toLocaleString(), days }),
        data: { payoutId: p._id.toString() },
      });
    }

    return { expired: stalePayout.length };
  }

  /**
   * Deletes read notifications older than `days` days to keep the collection lean.
   * Runs daily. Default threshold: 60 days.
   */
  async pruneOldNotifications(days = 60): Promise<{ pruned: number }> {
    const cutoff = daysAgo(days);
    const pruned = await notificationRepository.pruneRead(cutoff);
    return { pruned };
  }

  /**
   * Deletes activity log entries older than `days` days.
   * Runs daily. Default threshold: 90 days.
   */
  async pruneOldActivityLogs(days = 90): Promise<{ pruned: number }> {
    const cutoff = daysAgo(days);
    const pruned = await activityRepository.pruneOld(cutoff);
    return { pruned };
  }

  /**
   * Notifies admins about jobs still in `pending_validation` longer than `hours` hours.
   * Runs daily. Default threshold: 48 hours.
   */
  async alertStalePendingValidation(hours = 48): Promise<{ alerted: number }> {
    const cutoff = hoursAgo(hours);
    const staleJobs = await jobRepository.findStalePendingValidation(cutoff);
    if (staleJobs.length === 0) return { alerted: 0 };

    for (const job of staleJobs) {
      const j = job as unknown as JobDocument & {
        _id: { toString(): string };
        title: string;
      };

      await notificationService.notifyAdmins(
        "reminder_pending_validation",
        "Job awaiting validation",
        `Job "${j.title}" has been in pending_validation for over ${hours} hours and needs admin review.`,
        { jobId: j._id.toString() }
      );
    }

    return { alerted: staleJobs.length };
  }

  /**
   * Automatically opens a system dispute for funded in_progress jobs whose
   * `scheduleDate` passed more than `graceDays` ago without the provider
   * marking the job complete. Runs daily.
   *
   * @param graceDays - Number of days after scheduleDate before auto-dispute fires (default: 2)
   */
  async autoDisputeOverdueJobs(graceDays = 2): Promise<{ disputed: number }> {
    const cutoff = daysAgo(graceDays);
    // Pass 0 so daysAgo(0) = now; we want jobs where scheduleDate < (now - graceDays)
    const overdueJobs = await jobRepository.findOverdueInProgress(cutoff);
    if (overdueJobs.length === 0) return { disputed: 0 };

    let disputed = 0;

    for (const job of overdueJobs) {
      const j = job as unknown as {
        _id: { toString(): string };
        title: string;
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        scheduleDate: Date;
        budget: number;
      };

      try {
        // Create the system dispute record
        const dispute = await disputeRepository.create({
          jobId: j._id.toString(),
          raisedBy: "system",
          reason: `Job overdue — not completed within scheduled timeframe (scheduled: ${new Date(j.scheduleDate).toLocaleDateString()}).`,
        });

        // Transition the job to disputed
        await jobRepository.updateMany({ _id: j._id } as never, { status: "disputed" });

        // Log the automated action
        await activityRepository.log({
          userId: "system",
          eventType: "dispute_opened",
          jobId: j._id.toString(),
          metadata: {
            automated: true,
            graceDays,
            scheduledDate: j.scheduleDate,
            disputeId: dispute._id!.toString(),
          },
        });

        // Notify the client
        const { getNotificationT } = await import("@/services/notification.service");
        const tClient = await getNotificationT(j.clientId.toString());
        await notificationService.push({
          userId: j.clientId.toString(),
          type: "dispute_opened",
          title: tClient("disputeAutoOpenedTitle"),
          message: tClient("disputeAutoOpenedMessage", { jobTitle: j.title }),
          data: { jobId: j._id.toString(), disputeId: dispute._id!.toString() },
        });

        // Notify the provider
        if (j.providerId) {
          const tProvider = await getNotificationT(j.providerId.toString());
          await notificationService.push({
            userId: j.providerId.toString(),
            type: "dispute_opened",
            title: tProvider("disputeOverdueTitle"),
            message: tProvider("disputeOverdueMessage", { jobTitle: j.title }),
            data: { jobId: j._id.toString(), disputeId: dispute._id!.toString() },
          });
        }

        // Notify admins
        await notificationService.notifyAdmins(
          "dispute_opened",
          "Auto-dispute: overdue job",
          `Job "${j.title}" was automatically disputed after passing its scheduled date by ${graceDays}+ days.`,
          { jobId: j._id.toString(), disputeId: dispute._id!.toString() }
        );

        // Push real-time status update
        pushStatusUpdateMany(
          [j.clientId.toString(), j.providerId?.toString()].filter(Boolean) as string[],
          { entity: "job", id: j._id.toString(), status: "disputed" }
        );

        disputed++;
      } catch {
        // Log but continue so one failure doesn't stop the whole batch
        console.error(`[cron] autoDisputeOverdueJobs: failed for job ${j._id.toString()}`);
      }
    }

    return { disputed };
  }

  /**
   * Sends profile-completion nudges to users who:
   *  - Registered more than 3 days ago
   *  - Are missing phone, avatar, or email verification
   *  - Haven't already received this reminder in the last 7 days
   *
   * Also emails (via EMAIL_ALWAYS) so users don't miss it.
   * Run weekly (e.g. every Monday at 10 AM).
   */
  async sendProfileCompletionReminders(): Promise<{ notified: number }> {
    const cutoff  = daysAgo(3);   // only nudge after 3 days of inactivity
    const throttle = daysAgo(7);  // don't repeat within 7 days

    const users = await userRepository.findIncompleteProfiles(cutoff);

    let notified = 0;
    for (const u of users) {
      type U = typeof u & {
        _id:       { toString(): string };
        role:      "client" | "provider";
        name:      string;
        phone?:    string | null;
        avatar?:   string | null;
        isVerified: boolean;
        kycStatus?: string;
        addresses?: unknown[];
      };
      const user = u as unknown as U;
      const userId = user._id.toString();

      // Throttle — skip if we sent this reminder recently
      const alreadySent = await notificationRepository.wasRecentlySent(
        userId,
        "reminder_profile_incomplete",
        throttle
      );
      if (alreadySent) continue;

      // Build a personalised list of what's missing
      const missing: string[] = [];
      if (!user.isVerified)    missing.push("verify your email address");
      if (!user.phone)         missing.push("add a phone number");
      if (!user.avatar)        missing.push("upload a profile photo");
      if (user.role === "client" && !(user.addresses?.length))
        missing.push("save a default address");
      if (user.role === "provider" && (!user.kycStatus || user.kycStatus === "none"))
        missing.push("submit your KYC documents");

      if (missing.length === 0) continue; // already complete (race condition guard)

      const listText = missing.map((m, i) => `${i + 1}. ${m[0].toUpperCase()}${m.slice(1)}`).join(", ");

      const { getNotificationT } = await import("@/services/notification.service");
      const t = await getNotificationT(userId);
      await notificationService.push({
        userId,
        type: "reminder_profile_incomplete",
        title: t("profileIncompleteTitle"),
        message: t("profileIncompleteMessage", { name: user.name.split(" ")[0], items: listText }),
      });

      notified++;
    }

    return { notified };
  }

  /**
   * Resets `availabilityStatus` from "busy" to "available" for providers who
   * currently have no active (assigned / in_progress) jobs.
   * Runs daily.
   */
  async resetProviderAvailability(): Promise<{ reset: number }> {
    const activeProviderIds = await jobRepository.findActiveProviderIds();
    const reset = await providerProfileRepository.resetBusyExcluding(activeProviderIds);
    return { reset };
  }

  /**
   * Spawns jobs for all active recurring schedules whose `nextRunAt` is due.
   * Runs daily (or more frequently if desired).
   */
  async spawnRecurringJobs(): Promise<{ spawned: number; errors: string[] }> {
    const { recurringScheduleService } = await import("@/services/recurringSchedule.service");
    return recurringScheduleService.spawnDue();
  }
}

export const cronService = new CronService();
