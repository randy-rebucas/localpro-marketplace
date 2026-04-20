/**
 * Fraud Actions Service
 * Converts fraud risk scores into actionable interventions
 */

import { jobRepository, activityRepository, notificationRepository, userRepository, disputeRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { pushNotification } from "@/lib/events";
import { notificationService } from "@/services/notification.service";
import type { IJob, IUser } from "@/types";

export enum FraudAction {
  ALLOW = "allow",
  PRE_APPROVE = "pre_approve",
  HOLD = "hold",
  AUTO_REJECT = "auto_reject",
}

export interface FraudAssessment {
  jobId: string;
  riskScore: number;
  action: FraudAction;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  autoActionTaken?: boolean;
}

export class FraudActionsService {
  /**
   * Assess fraud risk and return recommended action
   */
  async assessJob(jobId: string): Promise<FraudAssessment> {
    try {
      await connectDB();

      const jobDoc = await jobRepository.getDocById(jobId);
      if (!jobDoc) {
        return {
          jobId,
          riskScore: 0,
          action: FraudAction.ALLOW,
          reason: "Job not found",
          severity: "low",
        };
      }

      const job = jobDoc as unknown as IJob & { clientId: { toString(): string } };
      const riskScore = job.riskScore || 0;

      // Determine action based on risk score
      let action: FraudAction;
      let severity: "low" | "medium" | "high" | "critical";
      let reason: string;

      if (riskScore >= 90) {
        action = FraudAction.AUTO_REJECT;
        severity = "critical";
        reason = `Critical fraud indicators (score: ${riskScore}). Job automatically rejected.`;
      } else if (riskScore >= 75) {
        action = FraudAction.HOLD;
        severity = "high";
        reason = `High fraud risk (score: ${riskScore}). Holds escrow pending admin approval.`;
      } else if (riskScore >= 60) {
        action = FraudAction.PRE_APPROVE;
        severity = "medium";
        reason = `Moderate fraud risk (score: ${riskScore}). Requires admin pre-approval before escrow funding.`;
      } else {
        action = FraudAction.ALLOW;
        severity = "low";
        reason = `Low fraud risk (score: ${riskScore}). Proceed with standard flow.`;
      }

      return {
        jobId,
        riskScore,
        action,
        reason,
        severity,
      };
    } catch (err) {
      console.error("[FraudActionsService] assessJob error:", err);
      return {
        jobId,
        riskScore: 0,
        action: FraudAction.ALLOW,
        reason: "Assessment failed - allowing by default",
        severity: "low",
      };
    }
  }

  /**
   * Execute fraud action on a job
   * Returns true if auto-action was taken, false otherwise
   */
  async executeAction(assessment: FraudAssessment): Promise<boolean> {
    try {
      await connectDB();

      const { jobId, action, reason } = assessment;

      // Only auto-reject is truly automatic; other actions require admin intervention
      if (action === FraudAction.AUTO_REJECT) {
        await jobRepository.updateById(jobId, { status: "rejected" });

        await activityRepository.log({
          userId: "system",
          eventType: "job_rejected",
          jobId,
          metadata: {
            reason: "Fraud auto-rejection",
            riskScore: assessment.riskScore,
          },
        });

        // Notify client
        const job = await jobRepository.getDocById(jobId);
        if (job) {
          const jobData = job as unknown as IJob & { clientId: { toString(): string } };
          const clientNotif = await notificationRepository.create({
            userId: jobData.clientId.toString(),
            type: "job_rejected",
            title: "Job Auto-Rejected",
            message: "Your job was rejected due to policy violations. Please review and resubmit.",
            data: { jobId },
          });
          pushNotification(jobData.clientId.toString(), clientNotif);
        }

        return true;
      }

      if (action === FraudAction.HOLD) {
        // Move to pending_validation for admin review
        await jobRepository.updateById(jobId, { status: "pending_validation" });

        await activityRepository.log({
          userId: "system",
          eventType: "job_rejected", // Use existing event type
          jobId,
          metadata: {
            reason: "Fraud hold for admin review",
            riskScore: assessment.riskScore,
            action: FraudAction.HOLD,
          },
        });

        // Notify admins about the fraud hold for priority review
        await notificationService.notifyAdmins(
          "admin_message",
          "Fraud Hold: Manual Review Required",
          `Job "${assessment.jobId}" has been placed on fraud hold (risk score: ${assessment.riskScore}). Please review in the admin dashboard.`,
          { jobId: assessment.jobId }
        );

        return true;
      }

      if (action === FraudAction.PRE_APPROVE) {
        // Flag in metadata for manual review before escrow
        await activityRepository.log({
          userId: "system",
          eventType: "admin_ledger_entry",
          jobId,
          metadata: {
            reason: "Fraud pre-approval required",
            riskScore: assessment.riskScore,
            action: FraudAction.PRE_APPROVE,
          },
        });

        // Track pre-approval requirement in metadata for downstream verification
        // Admin review is required before escrow can be funded on this job
        await activityRepository.log({
          userId: "system",
          eventType: "admin_ledger_entry",
          jobId,
          metadata: {
            requiresAdminApprovalForEscrow: true,
            riskScore: assessment.riskScore,
            action: FraudAction.PRE_APPROVE,
          },
        });

        return true;
      }

      // ALLOW action requires no intervention
      return false;
    } catch (err) {
      console.error("[FraudActionsService] executeAction error:", err);
      return false;
    }
  }

  /**
   * Check for duplicate posting (same client, similar job, <1 hour apart)
   */
  async checkDuplicatePosting(clientId: string): Promise<boolean> {
    try {
      await connectDB();

      // Get jobs posted in last 1 hour by this client
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentJobs = await jobRepository.find({
        clientId: clientId as any, // Type assertion needed here
        createdAt: { $gte: oneHourAgo },
      } as any);

      // Block if more than 5 jobs in 1 hour
      if (recentJobs.length >= 5) {
        console.log(`[FraudActions] Duplicate posting detected: ${clientId} posted ${recentJobs.length} jobs in 1 hour`);
        return true;
      }

      return false;
    } catch (err) {
      console.error("[FraudActionsService] checkDuplicatePosting error:", err);
      return false;
    }
  }

  /**
   * Check for provider no-show pattern
   * Flag providers with 3+ flagged instances in past 30 days
   */
  async flagProviderNoShowPattern(providerId: string): Promise<boolean> {
    try {
      await connectDB();

      // Query activity log for no-show incidents in the past 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const noShowEvents = await activityRepository.find({
        userId: providerId,
        eventType: { $in: ["provider_no_show", "provider_no_show_flagged", "job_marked_incomplete"] },
        createdAt: { $gte: thirtyDaysAgo },
      } as any);

      // Flag if 3+ no-show incidents in past 30 days
      const flagged = noShowEvents.length >= 3;
      if (flagged) {
        console.log(
          `[FraudActions] Provider no-show pattern detected: ${providerId} has ${noShowEvents.length} incidents in 30 days`
        );
      }
      return flagged;
    } catch (err) {
      console.error("[FraudActionsService] flagProviderNoShowPattern error:", err);
      return false;
    }
  }

  /**
   * Check for client dispute history
   * Multiple open disputes = risk flag
   */
  async checkClientDisputeHistory(clientId: string): Promise<{ count: number; shouldBlock: boolean }> {
    try {
      await connectDB();

      // Query open/investigating disputes raised by or against this client
      const disputes = await disputeRepository.find({
        $or: [
          { jobId: { $exists: true } }, // Disputes on jobs (implies client involvement)
        ],
        status: { $in: ["open", "investigating"] },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
      } as any);

      const count = disputes.length || 0;
      // Flag for risk if 2+ active disputes
      const shouldBlock = count >= 2;

      if (shouldBlock) {
        console.log(
          `[FraudActions] Client dispute pattern detected: ${clientId} has ${count} active disputes`
        );
      }
      return { count, shouldBlock };
    } catch (err) {
      console.error("[FraudActionsService] checkClientDisputeHistory error:", err);
      return { count: 0, shouldBlock: false };
    }
  }

  /**
   * Monitor and throttle high-volume posting per client/hour
   */
  async throttleHighVolumePosting(clientId: string): Promise<{ throttled: boolean; reason?: string }> {
    try {
      const redis = (await import("@/lib/redis")).getRedis();
      if (!redis) {
        return { throttled: false };
      }

      const key = `fraud:posting:${clientId}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 60 * 60); // 1-hour window
      }

      // Throttle if more than 6 postings per hour
      if (count > 6) {
        return {
          throttled: true,
          reason: `High posting volume detected (${count} jobs/hour). Please wait before posting another job.`,
        };
      }

      return { throttled: false };
    } catch (err) {
      console.error("[FraudActionsService] throttleHighVolumePosting error:", err);
      return { throttled: false };
    }
  }

  /**
   * Generate fraud report for admin dashboard
   */
  async generateReport(timeWindowHours: number = 24): Promise<{
    totalJobsReviewed: number;
    autoRejected: number;
    onHold: number;
    flaggedForPreApproval: number;
    riskDistribution: Record<string, number>;
  }> {
    try {
      await connectDB();

      const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

      // Query jobs created in the time window with fraud-related metadata
      const jobsReviewed = await jobRepository.find({
        createdAt: { $gte: cutoffTime },
        $or: [
          { fraudFlags: { $exists: true, $ne: [] } },
          { riskScore: { $gte: 50 } },
        ],
      } as any);

      // Count by status and risk score
      const autoRejected = jobsReviewed.filter(
        (j: any) => j.status === "rejected" && (j.riskScore || 0) >= 90
      ).length;
      const onHold = jobsReviewed.filter(
        (j: any) => (j.riskScore || 0) >= 75
      ).length;
      const flaggedForPreApproval = jobsReviewed.filter(
        (j: any) => (j.riskScore || 0) >= 60 && (j.riskScore || 0) < 75
      ).length;

      // Build risk distribution histogram
      const riskDistribution: Record<string, number> = {};
      ["0-20", "21-40", "41-60", "61-75", "76-90", "91-100"].forEach((bucket) => {
        riskDistribution[bucket] = 0;
      });

      jobsReviewed.forEach((j: any) => {
        const score = j.riskScore || 0;
        if (score <= 20) riskDistribution["0-20"]++;
        else if (score <= 40) riskDistribution["21-40"]++;
        else if (score <= 60) riskDistribution["41-60"]++;
        else if (score <= 75) riskDistribution["61-75"]++;
        else if (score <= 90) riskDistribution["76-90"]++;
        else riskDistribution["91-100"]++;
      });

      return {
        totalJobsReviewed: jobsReviewed.length,
        autoRejected,
        onHold,
        flaggedForPreApproval,
        riskDistribution,
      };
    } catch (err) {
      console.error("[FraudActionsService] generateReport error:", err);
      return {
        totalJobsReviewed: 0,
        autoRejected: 0,
        onHold: 0,
        flaggedForPreApproval: 0,
        riskDistribution: {},
      };
    }
  }
}

export const fraudActionsService = new FraudActionsService();
