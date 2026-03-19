import { notificationRepository, userRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushToUser } from "@/app/push/actions";
import { getRedis } from "@/lib/redis";
import type { NotificationType, INotification, IEmailCategories } from "@/types";

// ─── Notification → Email Category Mapping ───────────────────────────────────

const NOTIFICATION_CATEGORY: Record<string, keyof IEmailCategories> = {
  // Job lifecycle
  job_submitted:        "jobUpdates",
  job_approved:         "jobUpdates",
  job_rejected:         "jobUpdates",
  job_expired:          "jobUpdates",
  job_direct_invite:    "jobUpdates",
  recurring_job_spawned: "jobUpdates",
  // Quotes
  quote_received:       "quoteAlerts",
  quote_accepted:       "quoteAlerts",
  quote_rejected:       "quoteAlerts",
  quote_expired:        "quoteAlerts",
  // Payments & escrow
  escrow_funded:        "paymentAlerts",
  payment_confirmed:    "paymentAlerts",
  payment_failed:       "paymentAlerts",
  payment_reminder:     "paymentAlerts",
  job_completed:        "paymentAlerts",
  escrow_released:      "paymentAlerts",
  escrow_auto_released: "paymentAlerts",
  payout_requested:     "paymentAlerts",
  payout_status_update: "paymentAlerts",
  // Disputes
  dispute_opened:       "disputeAlerts",
  dispute_resolved:     "disputeAlerts",
  // Reviews
  review_received:      "reviews",
  // Messages
  new_message:          "messages",
  // Consultations
  consultation_request:  "consultations",
  consultation_accepted: "consultations",
  estimate_provided:     "consultations",
  consultation_stale:    "consultations",
  consultation_expired:  "consultations",
  // Reminders
  reminder_profile_incomplete: "reminders",
  reminder_fund_escrow:        "reminders",
  reminder_no_quotes:          "reminders",
  reminder_start_job:          "reminders",
  reminder_complete_job:       "reminders",
  reminder_leave_review:       "reminders",
  reminder_stale_dispute:      "reminders",
  reminder_pending_validation: "reminders",
};

// All notification types that should also send an email.
const EMAIL_ALWAYS: Set<NotificationType> = new Set([
  // Job lifecycle
  "job_submitted",
  "job_approved",
  "job_rejected",
  "job_expired",
  "job_direct_invite",
  "recurring_job_spawned",
  // Quotes
  "quote_received",
  "quote_accepted",
  "quote_rejected",
  "quote_expired",
  // Payments & escrow
  "escrow_funded",
  "payment_confirmed",
  "payment_failed",
  "payment_reminder",
  "job_completed",
  "escrow_released",
  "escrow_auto_released",
  // Payouts
  "payout_requested",
  "payout_status_update",
  // Disputes
  "dispute_opened",
  "dispute_resolved",
  // Reviews & messages
  "review_received",
  "new_message",
  // Consultations
  "consultation_request",
  "consultation_accepted",
  "estimate_provided",
  "consultation_stale",
  "consultation_expired",
  // Reminders
  "reminder_profile_incomplete",
  "reminder_fund_escrow",
  "reminder_no_quotes",
  "reminder_start_job",
  "reminder_complete_job",
  "reminder_leave_review",
  "reminder_stale_dispute",
  "reminder_pending_validation",
  // Agency — staff invited notification (email sent separately via sendAgencyInviteEmail)
  // agency_job_assigned email is sent directly from the assign route via sendAgencyJobAssignedEmail
  // admin_message is intentionally excluded — the admin message routes (single + bulk)
  // call sendEmail() directly, so letting it pass through here would double-send.
]);

// Notification types that involve an escrow/payment amount (look up payment record).
const PAYMENT_AMOUNT_TYPES: Set<NotificationType> = new Set([
  "escrow_funded",
  "payment_confirmed",
  "payment_failed",
  "job_completed",
  "escrow_released",
  "escrow_auto_released",
]);

// Important notification types that should trigger a web-push notification.
const PUSH_TYPES: Set<NotificationType> = new Set([
  "quote_received",
  "quote_accepted",
  "escrow_funded",
  "escrow_released",
  "job_completed",
  "dispute_opened",
  "dispute_resolved",
  "payment_confirmed",
  "job_direct_invite",
  "new_message",
]);

// ─── Quote Digest Batching ───────────────────────────────────────────────────

/** Redis key prefix for quote email digest suppression. TTL = 15 minutes. */
const QUOTE_DIGEST_KEY_PREFIX = "digest:quote:";
const QUOTE_DIGEST_TTL_SECONDS = 15 * 60; // 15 minutes

/** Build an in-app URL for a push notification based on its type and data. */
function buildNotificationUrl(
  type: NotificationType,
  data?: INotification["data"]
): string | undefined {
  const d = data ?? {};
  switch (type) {
    case "quote_received":
    case "quote_accepted":
      return d.jobId ? `/homeowner/jobs/${d.jobId}` : "/homeowner/jobs";
    case "escrow_funded":
    case "payment_confirmed":
      return d.jobId ? `/homeowner/jobs/${d.jobId}` : "/homeowner/jobs";
    case "escrow_released":
    case "job_completed":
      return d.jobId ? `/provider/jobs/${d.jobId}` : "/provider/jobs";
    case "dispute_opened":
    case "dispute_resolved":
      return d.disputeId
        ? `/disputes/${d.disputeId}`
        : d.jobId
          ? `/provider/jobs/${d.jobId}`
          : "/dashboard";
    case "job_direct_invite":
      return d.jobId ? `/provider/jobs/${d.jobId}` : "/provider/jobs";
    case "new_message":
      return d.jobId ? `/messages/${d.jobId}` : "/messages";
    default:
      return "/dashboard";
  }
}

/**
 * Check if the user has the email category enabled for a given notification type.
 * Returns true (send email) if:
 *  - The notification type has no category mapping (uncategorised → always send)
 *  - The user has no emailCategories preferences set (default → all enabled)
 *  - The specific category is explicitly enabled (or not set, defaulting to true)
 */
function isEmailCategoryEnabled(
  preferences: { emailCategories?: Partial<IEmailCategories> } | undefined,
  notificationType: string
): boolean {
  const category = NOTIFICATION_CATEGORY[notificationType];
  if (!category) return true; // uncategorised types always send

  const cats = preferences?.emailCategories;
  if (!cats) return true; // no preferences → all enabled by default

  // Treat undefined as true (opt-out model)
  return cats[category] !== false;
}

export interface PushNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: INotification["data"];
}

export class NotificationService {
  /** Create a notification for a single user, push it to their SSE stream, and optionally email/push. */
  async push(input: PushNotificationInput): Promise<void> {
    const notification = await notificationRepository.create(input);
    pushNotification(input.userId, notification);

    const needsEmail = EMAIL_ALWAYS.has(input.type);
    const needsPush = PUSH_TYPES.has(input.type);

    if (needsEmail || needsPush) {
      const user = await userRepository.findById(input.userId);

      if (needsEmail && user?.email) {
        // Check granular email category preferences
        const categoryEnabled = isEmailCategoryEnabled(user.preferences, input.type);
        // Check global email toggle
        const globalEnabled = user.preferences?.emailNotifications !== false;

        if (categoryEnabled && globalEnabled) {
          // Quote digest batching: suppress individual emails if one was recently sent
          const shouldBatch = await this.shouldBatchQuoteEmail(input);

          if (!shouldBatch) {
            this.buildAndSendEmail(user, input).catch((err) =>
              console.error("[EMAIL] Failed to send notification email:", err)
            );
          }
        }
      }

      if (needsPush && user?.preferences?.pushNotifications !== false) {
        sendPushToUser(input.userId, {
          title: input.title,
          body: input.message,
          url: buildNotificationUrl(input.type, input.data),
        }).catch((err) =>
          console.error("[PUSH] Failed to send push notification:", err)
        );
      }
    }
  }

  /**
   * For quote_received notifications, check Redis to see if a quote email
   * was already sent to this user in the last 15 minutes. If so, suppress
   * the individual email (the digest cron will batch it).
   *
   * If this is the first quote email, set the Redis key and allow it through.
   * Falls back to allowing the email if Redis is unavailable.
   */
  private async shouldBatchQuoteEmail(input: PushNotificationInput): Promise<boolean> {
    if (input.type !== "quote_received") return false;

    const redis = getRedis();
    if (!redis) return false; // No Redis → no batching, send immediately

    const key = `${QUOTE_DIGEST_KEY_PREFIX}${input.userId}`;
    try {
      const exists = await redis.exists(key);
      if (exists) {
        // A quote email was recently sent — suppress this one for the digest
        return true;
      }
      // First quote email in window — allow it and set the suppression key
      await redis.set(key, Date.now().toString(), { ex: QUOTE_DIGEST_TTL_SECONDS });
      return false;
    } catch (err) {
      console.error("[DIGEST] Redis error during quote batching check:", err);
      return false; // On error, fall back to sending the email
    }
  }

  /**
   * Send a batched quote digest email for users who have pending unread
   * quote_received notifications that were suppressed (not emailed individually).
   *
   * Called by the quote-digest cron job every 15 minutes.
   */
  async sendQuoteDigests(): Promise<{ sent: number }> {
    const redis = getRedis();
    const fifteenMinAgo = new Date(Date.now() - QUOTE_DIGEST_TTL_SECONDS * 1000);
    let sent = 0;

    // Find all unread quote_received notifications from the last 15 minutes
    const { default: Notification } = await import("@/models/Notification");
    const pendingNotifications = await Notification.aggregate([
      {
        $match: {
          type: "quote_received",
          readAt: null,
          createdAt: { $gte: fifteenMinAgo },
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          notifications: { $push: { title: "$title", message: "$message", data: "$data" } },
        },
      },
    ]);

    for (const group of pendingNotifications) {
      const userId = group._id.toString();

      // Only send digest if the Redis key exists (meaning individual email was suppressed)
      // If Redis is unavailable, skip digests since individual emails were sent
      if (redis) {
        const key = `${QUOTE_DIGEST_KEY_PREFIX}${userId}`;
        try {
          const exists = await redis.exists(key);
          if (!exists) continue; // No suppression key → individual email was never sent or window expired
        } catch {
          continue;
        }
      } else {
        continue;
      }

      // Need at least 2 notifications to justify a digest (1 was already emailed)
      if (group.count < 2) continue;

      const user = await userRepository.findById(userId);
      if (!user?.email) continue;

      // Check preferences
      if (user.preferences?.emailNotifications === false) continue;
      if (!isEmailCategoryEnabled(user.preferences, "quote_received")) continue;

      try {
        await sendNotificationEmail(user.email, {
          type: "quote_received",
          recipientName: user.name,
          recipientRole: user.role,
          title: `You received ${group.count} new quotes`,
          message: `You have ${group.count} new quotes waiting for your review. Log in to compare and accept the best offer.`,
          data: {},
        });
        sent++;
      } catch (err) {
        console.error(`[DIGEST] Failed to send quote digest to ${userId}:`, err);
      }
    }

    return { sent };
  }

  /** Build an enriched email context and dispatch through sendNotificationEmail. */
  private async buildAndSendEmail(
    user: { email: string; name: string; role?: string },
    input: PushNotificationInput
  ): Promise<void> {
    const d = input.data ?? {};
    let jobTitle: string | undefined = d.jobTitle;
    let amount: number | undefined = d.estimateAmount;

    // Look up job title when a jobId is available and title wasn't passed in data
    if (d.jobId && !jobTitle) {
      try {
        const { jobRepository } = await import("@/repositories");
        const job = await jobRepository.findById(d.jobId);
        jobTitle = (job as { title?: string } | null)?.title;

        // For financial events, pull the actual funded/released amount from the payment record
        if (PAYMENT_AMOUNT_TYPES.has(input.type)) {
          const { paymentRepository } = await import("@/repositories");
          const payment = await paymentRepository.findByJobId(d.jobId);
          amount =
            (payment as { amount?: number } | null)?.amount ??
            (job as { budget?: number } | null)?.budget;
        }
      } catch {
        // Non-critical — email still sends without enrichment
      }
    }

    // For payout events, pull the payout amount from the payout record
    if (!amount && d.payoutId && (input.type === "payout_requested" || input.type === "payout_status_update")) {
      try {
        const { payoutRepository } = await import("@/repositories");
        const payout = await payoutRepository.findById(d.payoutId);
        amount = (payout as { amount?: number } | null)?.amount;
      } catch {
        // Non-critical
      }
    }

    await sendNotificationEmail(user.email, {
      type: input.type,
      recipientName: user.name,
      recipientRole: user.role,
      title: input.title,
      message: input.message,
      data: {
        jobId: d.jobId,
        jobTitle,
        amount,
        quoteId: d.quoteId,
        consultationId: d.consultationId,
        estimateAmount: d.estimateAmount,
        payoutId: d.payoutId,
        disputeId: d.disputeId,
      },
    });
  }

  /** Broadcast a notification to all admin users. */
  async notifyAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: INotification["data"]
  ): Promise<void> {
    const admins = await userRepository.findAll({ role: "admin" });
    await Promise.all(
      admins.map((admin) =>
        this.push({ userId: admin._id!.toString(), type, title, message, data })
      )
    );
  }

  async listForUser(userId: string, limit = 30) {
    return notificationRepository.findForUser(userId, limit);
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await notificationRepository.markRead(notificationId, userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await notificationRepository.markAllRead(userId);
  }

  async countUnread(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }
}

export const notificationService = new NotificationService();
