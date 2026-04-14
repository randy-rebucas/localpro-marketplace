/**
 * Status Notifier Service
 * Sends proactive notifications on job status changes
 */

import { notificationRepository, userRepository, jobRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushToUser } from "@/app/push/actions";
import { connectDB } from "@/lib/db";
import type { IJob, INotification } from "@/types";

export interface NotificationConfig {
  jobId: string;
  status: IJob["status"];
  clientId: string;
  providerId?: string | null;
  providerName?: string;
  jobTitle?: string;
  budget?: number;
}

export class StatusNotifierService {
  /**
   * Generate and send notification on job status change
   * Returns true if notification was sent, false if skipped (spam prevention)
   */
  async notifyStatusChange(config: NotificationConfig): Promise<boolean> {
    try {
      await connectDB();

      const { jobId, status, clientId, providerId, providerName, jobTitle, budget } = config;

      // Determine notification type and recipients
      const notification = this.generateNotification(status, {
        jobId,
        clientId,
        providerId,
        providerName,
        jobTitle: jobTitle || "Your job",
        budget: budget || 0,
      });

      if (!notification) {
        return false; // No notification needed for this status
      }

      // Check spam prevention: max 3 notifications per job in first 4 hours
      const spamBlocked = await this.isSpamBlocked(jobId);
      if (spamBlocked) {
        console.log(`[StatusNotifier] Spam blocked for job ${jobId}`);
        return false;
      }

      // Send to client
      const clientNotif = await notificationRepository.create({
        userId: clientId,
        type: notification.type,
        title: notification.clientTitle,
        message: notification.clientMessage,
        data: { jobId },
      });
      pushNotification(clientId, clientNotif);

      // Send email to client if opted in
      const clientUser = await userRepository.findById(clientId);
      if (clientUser && clientUser.email && this.shouldEmailNotify(notification.type)) {
        await sendNotificationEmail(
          clientUser.email,
          {
            type: notification.type as any,
            recipientName: clientUser.name || "Valued User",
            title: notification.clientTitle,
            message: notification.clientMessage,
            data: { jobId, jobTitle },
          }
        ).catch((err) => console.error("[StatusNotifier] email error:", err));
      }

      // Send to provider if applicable
      if (providerId && notification.providerMessage) {
        const providerNotif = await notificationRepository.create({
          userId: providerId,
          type: notification.type,
          title: notification.providerTitle || notification.clientTitle,
          message: notification.providerMessage,
          data: { jobId },
        });
        pushNotification(providerId, providerNotif);

        const providerUser = await userRepository.findById(providerId);
        if (providerUser && providerUser.email && this.shouldEmailNotify(notification.type)) {
          await sendNotificationEmail(
            providerUser.email,
            {
              type: notification.type as any,
              recipientName: providerUser.name || "Valued Provider",
              title: notification.providerTitle || notification.clientTitle,
              message: notification.providerMessage,
              data: { jobId, jobTitle },
            }
          ).catch((err) => console.error("[StatusNotifier] email error:", err));
        }
      }

      return true;
    } catch (err) {
      console.error("[StatusNotifierService] notifyStatusChange error:", err);
      return false;
    }
  }

  /**
   * Assign notification content based on job status
   */
  private generateNotification(
    status: IJob["status"],
    context: {
      jobId: string;
      clientId: string;
      providerId?: string | null;
      providerName?: string;
      jobTitle: string;
      budget: number;
    }
  ) {
    const { jobTitle, providerName, budget } = context;

    switch (status) {
      case "open":
        return {
          type: "job_submitted" as const,
          clientTitle: "Your job is live!",
          clientMessage: `"${jobTitle}" is now visible to providers. Check back for quotes.`,
          providerMessage: null,
        };

      case "assigned":
        return {
          type: "quote_accepted" as const,
          clientTitle: "Provider assigned!",
          clientMessage: `${providerName || "A provider"} has been assigned to "${jobTitle}". You can chat with them now.`,
          providerTitle: "You've been assigned a job",
          providerMessage: `You've been assigned to "${jobTitle}" (₱${budget.toLocaleString()}). Confirm your availability.`,
        };

      case "in_progress":
        return {
          type: "job_started" as const,
          clientTitle: "Work has started!",
          clientMessage: `${providerName || "Your provider"} has started working on "${jobTitle}". You can track progress here.`,
          providerTitle: "Confirmed - Work in progress",
          providerMessage: `You've checked in for "${jobTitle}". Update the client as you progress.`,
        };

      case "completed":
        return {
          type: "job_completed" as const,
          clientTitle: "Job completed!",
          clientMessage: `"${jobTitle}" is complete. Review the work and leave feedback.`,
          providerTitle: "Job completed",
          providerMessage: `You've marked "${jobTitle}" as complete. Awaiting client review.`,
        };

      case "disputed":
        return {
          type: "dispute_opened" as const,
          clientTitle: "Dispute filed",
          clientMessage: `A dispute has been opened for "${jobTitle}". Our team will investigate.`,
          providerTitle: "Dispute filed",
          providerMessage: `A dispute has been filed for "${jobTitle}". Our team will investigate.`,
        };

      case "refunded":
        return {
          type: "escrow_auto_released" as const,
          clientTitle: "Refund processed",
          clientMessage: `Your refund for "${jobTitle}" has been processed. Check your account.`,
          providerMessage: null,
        };

      case "rejected":
        return {
          type: "job_rejected" as const,
          clientTitle: "Job rejected",
          clientMessage: `"${jobTitle}" could not be posted. Check for any policy issues and resubmit.`,
          providerMessage: null,
        };

      case "cancelled":
        return {
          type: "job_cancelled" as const,
          clientTitle: "Job cancelled",
          clientMessage: `"${jobTitle}" has been cancelled.`,
          providerTitle: "Job cancelled",
          providerMessage: `"${jobTitle}" has been cancelled by the client.`,
        };

      default:
        return null;
    }
  }

  /**
   * Check if notification should be blocked (spam prevention)
   * Allow max 3 notifications per job in first 4 hours
   */
  private async isSpamBlocked(jobId: string): Promise<boolean> {
    try {
      const redis = (await import("@/lib/redis")).getRedis();
      if (!redis) return false;

      const key = `notif:spam:${jobId}`;
      const count = await redis.incr(key);

      if (count === 1) {
        // Set 4-hour expiration on first notification
        await redis.expire(key, 4 * 60 * 60);
      }

      // Block if more than 3 notifications in 4-hour window
      return count > 3;
    } catch (err) {
      console.error("[StatusNotifier] spam check error:", err);
      return false; // Don't block if redis fails
    }
  }

  /**
   * Determine if notification type should trigger email
   */
  private shouldEmailNotify(notificationType: string): boolean {
    const emailTypes = new Set([
      "job_submitted",
      "quote_accepted",
      "job_started",
      "job_completed",
      "dispute_opened",
      "job_rejected",
      "job_cancelled",
    ]);
    return emailTypes.has(notificationType);
  }
}

export const statusNotifierService = new StatusNotifierService();
