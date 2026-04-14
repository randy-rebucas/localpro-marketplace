import { jobRepository } from "@/repositories/job.repository";
import { userRepository } from "@/repositories/user.repository";
import { activityRepository } from "@/repositories/activity.repository";
import { notificationRepository } from "@/repositories/notification.repository";
import { geoVerificationService } from "@/services/geo-verification.service";
import type { IJob } from "@/types";
import { pushNotification } from "@/lib/events";
import { sendNotificationEmail } from "@/lib/email";

interface ReplacementRequest {
  jobId: string;
  currentProviderId: string;
  reason: "no_show" | "rejection" | "cancellation" | "unavailable";
  attemptNumber: number;
}

interface ReplacementResult {
  success: boolean;
  newProviderId?: string;
  message: string;
  escalatedToAdmin: boolean;
}

interface ReplacementMetadata {
  jobId: string;
  originalProviderId: string;
  replacementHistory: Array<{
    providerId: string;
    timestamp: Date;
    reason: string;
    status: "accepted" | "rejected" | "expired";
  }>;
  totalAttempts: number;
  escalatedToAdmin: boolean;
}

/**
 * ProviderReplacementService - Handles finding and assigning replacement providers
 * - Finds alternative providers when current provider no-shows or unavailable
 * - Tracks replacement attempts (max 2 before escalating)
 * - Matches replacements based on original matching criteria
 * - Escalates to admin after 2 failed replacements
 */
class ProviderReplacementService {
  private readonly MAX_REPLACEMENT_ATTEMPTS = 2;
  private readonly MATCH_WINDOW_HOURS = 2; // Find replacements within 2 hours

  /**
   * Find replacement providers for a job
   * Uses similar matching criteria as original provider match
   */
  async findReplacementProviders(
    jobId: string,
    excludeProviderIds: string[] = []
  ): Promise<
    Array<{
      providerId: string;
      providerName: string;
      rating: number;
      matchScore: number;
      reason: string;
    }>
  > {
    try {
      const job = await jobRepository.getDocById(jobId);
      if (!job) {
        return [];
      }

      // Dynamically import provider-matcher service
      const { providerMatcherService } = await import(
        "@/services/provider-matcher.service"
      );

      // Find providers matching the job
      const matches = await providerMatcherService.findProvidersForJob(job);

      // Filter out already-tried providers and current provider
      const allExcluded = [...excludeProviderIds, job.providerId?.toString() || ""];
      const available = matches.filter(
        (m) => !allExcluded.includes(m.providerId.toString())
      );

      // Return top 3 matches
      return available.slice(0, 3).map((m) => ({
        providerId: m.providerId.toString(),
        providerName: m.user?.name || "Provider",
        rating: (m.user as any)?.avgRating || 0,
        matchScore: m.matchScore,
        reason: m.reason,
      }));
    } catch (error) {
      console.error("[ProviderReplacementService] findReplacementProviders error:", error);
      return [];
    }
  }

  /**
   * Execute provider replacement - assign new provider and notify all parties
   */
  async replaceProvider(request: ReplacementRequest): Promise<ReplacementResult> {
    try {
      const job = await jobRepository.getDocById(request.jobId);
      if (!job) {
        return {
          success: false,
          message: "Job not found",
          escalatedToAdmin: false,
        };
      }

      // Check if we've exceeded max replacement attempts
      const replacementAttempts = await this.getReplacementAttempts(request.jobId);
      if (replacementAttempts >= this.MAX_REPLACEMENT_ATTEMPTS) {
        // Escalate to admin
        await this.executeEscalation(request);
        return {
          success: false,
          message: `Maximum replacement attempts (${this.MAX_REPLACEMENT_ATTEMPTS}) exceeded. Job escalated to admin.`,
          escalatedToAdmin: true,
        };
      }

      // Find replacement providers (excluding current and previously tried)
      const previousAttempts = await this.getPreviousReplacementAttempts(
        request.jobId
      );
      const excludedIds = previousAttempts.map((a) => a.providerId);

      const replacements = await this.findReplacementProviders(
        request.jobId,
        excludedIds
      );

      if (replacements.length === 0) {
        // No replacements available - escalate
        await this.executeEscalation(request);
        return {
          success: false,
          message: "No available replacement providers. Job escalated to admin.",
          escalatedToAdmin: true,
        };
      }

      // Assign first available replacement
      const newProvider = replacements[0];
      const newProviderId = new (require("mongoose").Types.ObjectId)(
        newProvider.providerId
      );

      // Update job with new provider
      await jobRepository.updateById(request.jobId, {
        providerId: newProviderId,
        status: "assigned",
      });

      // Log replacement activity
      await activityRepository.log({
        userId: newProviderId,
        eventType: "admin_ledger_entry",
        jobId: new (require("mongoose").Types.ObjectId)(request.jobId),
        metadata: {
          action: "provider_replacement",
          reason: request.reason,
          previousProviderId: request.currentProviderId,
          replacementAttempt: replacementAttempts + 1,
          matchScore: newProvider.matchScore,
        },
      });

      // Notify old provider about replacement
      await this.notifyProviderReplaced(
        request.currentProviderId,
        request.jobId,
        newProvider.providerName,
        request.reason
      );

      // Notify new provider about assignment
      await this.notifyNewProviderAssigned(
        newProvider.providerId,
        request.jobId,
        job.title,
        job.budget
      );

      // Notify client about replacement
      await this.notifyClientAboutReplacement(
        job.clientId.toString(),
        request.jobId,
        job.title,
        newProvider.providerName
      );

      // Update status notifier about the change
      try {
        const { statusNotifierService } = await import(
          "@/services/status-notifier.service"
        );
        await statusNotifierService.notifyStatusChange({
          jobId: request.jobId,
          status: "assigned",
          clientId: job.clientId.toString(),
          providerId: newProviderId.toString(),
          providerName: newProvider.providerName,
          jobTitle: job.title,
        });
      } catch (err) {
        console.error(
          "[ProviderReplacementService] Status notifier error:",
          err
        );
      }

      return {
        success: true,
        newProviderId: newProvider.providerId,
        message: `Provider replaced successfully. New provider: ${newProvider.providerName}`,
        escalatedToAdmin: false,
      };
    } catch (error) {
      console.error("[ProviderReplacementService] replaceProvider error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Replacement failed",
        escalatedToAdmin: false,
      };
    }
  }

  /**
   * Get count of replacement attempts for a job
   */
  async getReplacementAttempts(jobId: string): Promise<number> {
    try {
      const attempts = await activityRepository.find({
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
      });
      return attempts.filter(
        (a) => a.eventType === "admin_ledger_entry" && (a.metadata?.action as string) === "provider_replacement"
      ).length;
    } catch (error) {
      console.error("[ProviderReplacementService] getReplacementAttempts error:", error);
      return 0;
    }
  }

  /**
   * Get historical replacement attempts with details
   */
  private async getPreviousReplacementAttempts(
    jobId: string
  ): Promise<
    Array<{
      providerId: string;
      timestamp: Date;
      reason: string;
    }>
  > {
    try {
      const attempts = await activityRepository.find({
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
      });
      return attempts
        .filter((a) => a.eventType === "admin_ledger_entry" && (a.metadata?.action as string) === "provider_replacement")
        .map((a) => ({
          providerId: (a.metadata?.previousProviderId as string) || "",
          timestamp: new Date(a.createdAt),
          reason: (a.metadata?.reason as string) || "",
        }));
    } catch (error) {
      console.error(
        "[ProviderReplacementService] getPreviousReplacementAttempts error:",
        error
      );
      return [];
    }
  }

  /**
   * Escalate job to admin after max replacement attempts exceeded
   */
  private async executeEscalation(request: ReplacementRequest): Promise<void> {
    try {
      const job = await jobRepository.getDocById(request.jobId);
      if (!job) return;

      // Update job status to indicate admin escalation needed
      await jobRepository.updateById(request.jobId, {
        status: "pending_validation", // Re-open for admin assignment
      });

      // Log escalation event
      await activityRepository.log({
        userId: null as any,
        eventType: "admin_ledger_entry",
        jobId: new (require("mongoose").Types.ObjectId)(request.jobId),
        metadata: {
          reason: `Provider replacement escalation due to ${request.reason}`,
          replacementAttempts: this.MAX_REPLACEMENT_ATTEMPTS,
          jobTitle: job.title,
          clientId: job.clientId.toString(),
        },
      });

      // Create admin notification
      const adminNotification = {
        userId: null,
        type: "admin_escalation_required",
        title: "Job Requires Admin Assignment",
        message: `Job "${job.title}" needs manual provider assignment after ${this.MAX_REPLACEMENT_ATTEMPTS} replacement attempts.`,
        data: {
          jobId: request.jobId,
          reason: request.reason,
          clientId: job.clientId.toString(),
        },
        readAt: null,
      };

      await notificationRepository.create(adminNotification as any);
    } catch (error) {
      console.error("[ProviderReplacementService] executeEscalation error:", error);
    }
  }

  /**
   * Notify original provider they've been replaced
   */
  private async notifyProviderReplaced(
    providerId: string,
    jobId: string,
    newProviderName: string,
    reason: string
  ): Promise<void> {
    try {
      const provider = await userRepository.findById(providerId);
      if (!provider) return;

      const reasonText = {
        no_show: "You did not check in within the required timeframe",
        rejection: "You rejected the job",
        cancellation: "You cancelled the job",
        unavailable: "You marked yourself as unavailable",
      }[reason] || reason;

      const message = `A new provider has been assigned to replace you. ${reasonText}. Please review your schedule and availability settings.`;

      // Push notification
      try {
        pushNotification(providerId, {
          title: "Provider Change Notice",
          body: message,
          data: {
            jobId,
            type: "provider_replaced",
            newProviderName,
          },
        });
      } catch (err) {
        console.error("[ProviderReplacementService] Push error:", err);
      }

      // Email notification
      const emailContext = {
        type: "job_direct_invite" as const,
        recipientName: provider.name || "Provider",
        title: "Provider Change Notice",
        message,
        data: {
          jobId,
        },
      };

      await sendNotificationEmail(provider.email, emailContext).catch((err) =>
        console.error("[ProviderReplacementService] Email error:", err)
      );
    } catch (error) {
      console.error("[ProviderReplacementService] notifyProviderReplaced error:", error);
    }
  }

  /**
   * Notify new provider about assignment
   */
  private async notifyNewProviderAssigned(
    providerId: string,
    jobId: string,
    jobTitle: string,
    jobBudget: number
  ): Promise<void> {
    try {
      const provider = await userRepository.findById(providerId);
      if (!provider) return;

      const message = `You've been assigned to "${jobTitle}" (₱${jobBudget}). Please review the job details and confirm your availability.`;

      // Push notification
      try {
        pushNotification(providerId, {
          title: "New Job Assignment",
          body: message,
          data: {
            jobId,
            type: "job_assigned",
            jobTitle,
            budget: jobBudget.toString(),
          },
        });
      } catch (err) {
        console.error("[ProviderReplacementService] Push error:", err);
      }

      // Email notification
      const emailContext = {
        type: "job_direct_invite" as const,
        recipientName: provider.name || "Provider",
        title: "New Job Assignment",
        message,
        data: {
          jobId,
          jobTitle,
        },
      };

      await sendNotificationEmail(provider.email, emailContext).catch((err) =>
        console.error("[ProviderReplacementService] Email error:", err)
      );
    } catch (error) {
      console.error("[ProviderReplacementService] notifyNewProviderAssigned error:", error);
    }
  }

  /**
   * Notify client about replacement provider
   */
  private async notifyClientAboutReplacement(
    clientId: string,
    jobId: string,
    jobTitle: string,
    newProviderName: string
  ): Promise<void> {
    try {
      const client = await userRepository.findById(clientId);
      if (!client) return;

      const message = `Your job "${jobTitle}" has been reassigned. Your new provider is ${newProviderName}.`;

      // Push notification
      try {
        pushNotification(clientId, {
          title: "Job Provider Changed",
          body: message,
          data: {
            jobId,
            type: "provider_changed",
            newProviderName,
          },
        });
      } catch (err) {
        console.error("[ProviderReplacementService] Push error:", err);
      }

      // Email notification
      const emailContext = {
        type: "quote_accepted" as const,
        recipientName: client.name || "Client",
        title: "Job Provider Changed",
        message,
        data: {
          jobId,
          jobTitle,
        },
      };

      await sendNotificationEmail(client.email, emailContext).catch((err) =>
        console.error("[ProviderReplacementService] Email error:", err)
      );
    } catch (error) {
      console.error("[ProviderReplacementService] notifyClientAboutReplacement error:", error);
    }
  }

  /**
   * Generate replacement report for job
   */
  async generateReplacementReport(jobId: string): Promise<ReplacementMetadata | null> {
    try {
      const job = await jobRepository.getDocById(jobId);
      if (!job) return null;

      const attempts = await activityRepository.find({
        jobId: new (require("mongoose").Types.ObjectId)(jobId),
      });
      const replacements = attempts.filter(
        (a) => a.eventType === "admin_ledger_entry" && (a.metadata?.action as string) === "provider_replacement"
      );

      return {
        jobId,
        originalProviderId: job.providerId?.toString() || "",
        replacementHistory: replacements.map((r) => ({
          providerId: (r.metadata?.previousProviderId as string) || "",
          timestamp: new Date(r.createdAt),
          reason: (r.metadata?.reason as string) || "",
          status: "accepted", // TODO: track actual status
        })),
        totalAttempts: replacements.length,
        escalatedToAdmin: (replacements.length >= this.MAX_REPLACEMENT_ATTEMPTS),
      };
    } catch (error) {
      console.error("[ProviderReplacementService] generateReplacementReport error:", error);
      return null;
    }
  }
}

export const providerReplacementService = new ProviderReplacementService();
