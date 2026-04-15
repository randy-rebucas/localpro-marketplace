/**
 * Status Notifier Service
 * Sends proactive notifications on job status changes
 */

import { notificationRepository, userRepository, jobRepository } from "@/repositories";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushToUser } from "@/app/push/actions";
import { connectDB } from "@/lib/db";
import { messageFormatterService, type MessageScenario } from "./message-formatter.service";
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

      // Map job status to message scenario
      const scenario = this.mapStatusToScenario(status);
      if (!scenario) {
        return false; // No notification needed for this status
      }

      // Fetch full job details for message context
      const job = jobId ? await jobRepository.getDocById(jobId) : null;
      const clientUser = await userRepository.findById(clientId);
      const providerUser = providerId ? await userRepository.findById(providerId) : null;

      // Check spam prevention: max 3 notifications per job in first 4 hours
      const spamBlocked = await this.isSpamBlocked(jobId);
      if (spamBlocked) {
        console.log(`[StatusNotifier] Spam blocked for job ${jobId}`);
        return false;
      }

      // Format message for CUSTOMER (client)
      const customerMessage = messageFormatterService.formatMessage({
        scenario,
        persona: "customer",
        data: {
          jobId,
          jobTitle: jobTitle || job?.title || "Your job",
          clientName: clientUser?.name || "Valued User",
          providerName: providerName || providerUser?.name || "Your provider",
          budget: budget || job?.budget || 0,
          category: job?.category,
          location: job?.location,
          scheduleDate: job?.scheduleDate,
          ...this.getStatusSpecificData(status, job),
        },
      });

      // Send to client
      const clientNotif = await notificationRepository.create({
        userId: clientId,
        type: scenario as any,
        title: customerMessage.title,
        message: customerMessage.body,
        data: customerMessage.dataPayload || { jobId },
      });
      pushNotification(clientId, {
        title: customerMessage.title,
        body: customerMessage.body,
        data: customerMessage.dataPayload || { jobId },
      });

      // Send email to client if opted in
      if (clientUser && clientUser.email && this.shouldEmailNotify(scenario as any)) {
        await sendNotificationEmail(
          clientUser.email,
          {
            type: scenario as any,
            recipientName: clientUser.name || "Valued User",
            title: customerMessage.title,
            message: customerMessage.body,
            data: customerMessage.dataPayload || { jobId, jobTitle },
          }
        ).catch((err) => console.error("[StatusNotifier] email error:", err));
      }

      // Send to provider if applicable
      if (providerId && providerUser) {
        const providerMessage = messageFormatterService.formatMessage({
          scenario,
          persona: "provider",
          data: {
            jobId,
            jobTitle: jobTitle || job?.title || "Your job",
            clientName: clientUser?.name || "Client",
            providerName: providerUser.name || "You",
            budget: budget || job?.budget || 0,
            category: job?.category,
            location: job?.location,
            scheduleDate: job?.scheduleDate,
            ...this.getStatusSpecificData(status, job),
          },
        });

        const providerNotif = await notificationRepository.create({
          userId: providerId,
          type: scenario as any,
          title: providerMessage.title,
          message: providerMessage.body,
          data: providerMessage.dataPayload || { jobId },
        });
        pushNotification(providerId, {
          title: providerMessage.title,
          body: providerMessage.body,
          data: providerMessage.dataPayload || { jobId },
        });

        if (providerUser.email && this.shouldEmailNotify(scenario as any)) {
          await sendNotificationEmail(
            providerUser.email,
            {
              type: scenario as any,
              recipientName: providerUser.name || "Valued Provider",
              title: providerMessage.title,
              message: providerMessage.body,
              data: providerMessage.dataPayload || { jobId, jobTitle },
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
   * Map job status to message formatter scenario
   */
  private mapStatusToScenario(status: IJob["status"]): MessageScenario | null {
    const statusMap: Record<IJob["status"], MessageScenario | null> = {
      pending_validation: null, // No notification for pending validation
      open: "job_spawned",
      assigned: "job_assigned",
      in_progress: "job_started",
      completed: "job_completed",
      disputed: "escalation_alert",
      rejected: null,
      refunded: "escrow_released",
      expired: null, // No notification for expired
      cancelled: null,
    };
    return statusMap[status];
  }

  /**
   * Get additional context data for specific job statuses
   */
  private getStatusSpecificData(status: IJob["status"], job: any) {
    const data: any = {};

    if (job) {
      data.jobId = job._id?.toString();
      data.clientId = job.clientId?.toString();
      data.providerId = job.providerId?.toString();
      data.riskScore = job.riskScore || 0;
      data.autoPayEnabled = job.autoPayEnabled;
    }

    switch (status) {
      case "assigned":
        data.runNumber = job?.currentRun || 1;
        data.maxRuns = job?.maxRuns || 1;
        break;
      case "completed":
        data.autoRelease = job?.escrowStatus === "auto_released";
        break;
      case "disputed":
        data.escalationId = job?._id?.toString();
        data.reason = "Job under review";
        data.severity = "MEDIUM";
        break;
    }

    return data;
  }

  /**
   * LEGACY: Assign notification content based on job status
   * Used as fallback if formatter is unavailable
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
