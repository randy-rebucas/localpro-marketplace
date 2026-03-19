import { notificationRepository, userRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushToUser } from "@/app/push/actions";
import type { NotificationType, INotification } from "@/types";

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
        // Enrich email context asynchronously (fire-and-forget)
        this.buildAndSendEmail(user, input).catch((err) =>
          console.error("[EMAIL] Failed to send notification email:", err)
        );
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

