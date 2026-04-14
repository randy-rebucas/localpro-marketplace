/**
 * Fraud Actions Service
 * Converts fraud risk scores into actionable interventions
 */

import { jobRepository, activityRepository, notificationRepository, userRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { pushNotification } from "@/lib/events";
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

        // Notify admin (would need admin user ID lookup)
        // TODO: Route to admin dashboard as priority item

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

        // Job can proceed to quote phase but requires admin approval for escrow
        // TODO: Add flag to job document to track pre-approval status

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

      // TODO: Query from activity log or provider metrics
      // For now, return false (not implemented)
      return false;
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

      // TODO: Query dispute repository when fully integrated
      // For now, return no disputes
      return { count: 0, shouldBlock: false };
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

      // Count jobs by status (with fraud-related metadata)
      // TODO: Implement full reporting query
      return {
        totalJobsReviewed: 0,
        autoRejected: 0,
        onHold: 0,
        flaggedForPreApproval: 0,
        riskDistribution: {},
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
