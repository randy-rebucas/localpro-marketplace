import { notificationRepository, userRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import type { NotificationType, INotification } from "@/types";

// Notification types that always warrant an email in addition to in-app push
const EMAIL_ALWAYS: Set<NotificationType> = new Set([
  "job_submitted",
  "job_approved",
  "job_rejected",
  "quote_received",
  "quote_accepted",
  "quote_rejected",
  "escrow_funded",
  "payment_confirmed",
  "job_completed",
  "escrow_released",
  "dispute_opened",
  "dispute_resolved",
]);

export interface PushNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: INotification["data"];
}

export class NotificationService {
  /** Create a notification for a single user, push it to their SSE stream, and optionally email. */
  async push(input: PushNotificationInput): Promise<void> {
    const notification = await notificationRepository.create(input);
    pushNotification(input.userId, notification);

    if (EMAIL_ALWAYS.has(input.type)) {
      const user = await userRepository.findById(input.userId);
      if (user?.email) {
        sendNotificationEmail(user.email, {
          type: input.type,
          recipientName: user.name,
          title: input.title,
          message: input.message,
          data: input.data
            ? {
                jobId: input.data.jobId,
                quoteId: input.data.quoteId,
              }
            : undefined,
        });
      }
    }
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
