/**
 * Escalation Service
 * Manages automated escalation of high-risk or problematic jobs
 */

import { jobRepository, userRepository, activityRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { pushNotification } from "@/lib/events";
import type { IJob, IUser } from "@/types";

export enum EscalationReason {
  HIGH_FRAUD_SCORE = "high_fraud_score",
  CLIENT_DISPUTE_HISTORY = "client_dispute_history",
  NO_PROVIDER_MATCH = "no_provider_match",
  PROVIDER_NO_SHOW = "provider_no_show",
  PAYMENT_ISSUE = "payment_issue",
  SAFETY_CONCERN = "safety_concern",
  MANUAL_ESCALATION = "manual_escalation",
}

export interface EscalationEvent {
  jobId: string;
  reason: EscalationReason;
  severity: "low" | "medium" | "high" | "critical";
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class EscalationService {
  /**
   * Evaluate a newly-created job for escalation triggers
   * Returns escalation event if job meets escalation criteria, null otherwise
   */
  async evaluateNewJob(jobId: string): Promise<EscalationEvent | null> {
    try {
      await connectDB();

      const jobDoc = await jobRepository.getDocById(jobId);
      if (!jobDoc) return null;

      const job = jobDoc as unknown as IJob & { clientId: { toString(): string } };
      const clientId = job.clientId.toString();

      // Trigger 1: Check for high fraud score (>= 85)
      if ((job.riskScore || 0) >= 85) {
        const escalation = await this.handleHighFraudScore(job, clientId);
        if (escalation) return escalation;
      }

      // Trigger 2: Check client dispute history
      const clientDisputes = await this.checkClientDisputeHistory(clientId);
      if (clientDisputes >= 3) {
        const escalation = await this.handleClientDisputeHistory(job, clientId, clientDisputes);
        if (escalation) return escalation;
      }

      // Trigger 3: Check for flagged content in job description/title
      if (this.hasSuspiciousFlags(job)) {
        const escalation = await this.handleSuspiciousFlags(job, clientId);
        if (escalation) return escalation;
      }

      // Trigger 4: Check for high-budget jobs (potential P2P payment risks)
      if (job.budget > 50000) {
        const escalation = await this.handleHighBudgetJob(job, clientId);
        if (escalation) return escalation;
      }

      return null;
    } catch (err) {
      console.error("[EscalationService] evaluateNewJob error:", err);
      return null;
    }
  }

  /**
   * Handle no-provider scenario: 2+ hours with no acceptance
   */
  async triggerNoProviderEscalation(jobId: string, scheduleDate: Date): Promise<EscalationEvent | null> {
    try {
      await connectDB();

      const jobDoc = await jobRepository.getDocById(jobId);
      if (!jobDoc) return null;

      const job = jobDoc as unknown as IJob & { clientId: { toString(): string } };

      // Check if still open (not assigned)
      if (job.status !== "open") {
        return null;
      }

      // Log escalation
      const escalation: EscalationEvent = {
        jobId,
        reason: EscalationReason.NO_PROVIDER_MATCH,
        severity: "high",
        action: "Move to priority queue; match with backup providers; notify PESO officer if available",
        metadata: {
          originalScheduleDate: scheduleDate,
          escalatedAt: new Date(),
        },
        createdAt: new Date(),
      };

      await activityRepository.log({
        userId: job.clientId.toString(),
        eventType: "dispute_opened",
        jobId,
        metadata: {
          escalation_reason: escalation.reason,
          escalation_severity: escalation.severity,
          action: escalation.action,
        },
      });

      return escalation;
    } catch (err) {
      console.error("[EscalationService] triggerNoProviderEscalation error:", err);
      return null;
    }
  }

  /**
   * Handle provider no-show: scheduled time + 30 mins with no check-in
   */
  async triggerProviderNoShowEscalation(
    jobId: string,
    providerId: string
  ): Promise<EscalationEvent | null> {
    try {
      await connectDB();

      const jobDoc = await jobRepository.getDocById(jobId);
      if (!jobDoc) return null;

      const job = jobDoc as unknown as IJob & { clientId: { toString(): string } };

      if (job.status !== "in_progress") {
        return null;
      }

      const escalation: EscalationEvent = {
        jobId,
        reason: EscalationReason.PROVIDER_NO_SHOW,
        severity: "high",
        action: "Flag provider attendance risk; offer client replacement provider; auto-hold escrow pending client choice",
        metadata: {
          providerId,
          noShowTime: new Date(),
        },
        createdAt: new Date(),
      };

      await activityRepository.log({
        userId: job.clientId.toString(),
        eventType: "provider_withdrew",
        jobId,
        metadata: {
          escalation_reason: escalation.reason,
          escalation_severity: escalation.severity,
          providerId,
        },
      });

      return escalation;
    } catch (err) {
      console.error("[EscalationService] triggerProviderNoShowEscalation error:", err);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Handle high fraud score jobs
   */
  private async handleHighFraudScore(
    job: IJob,
    clientId: string
  ): Promise<EscalationEvent | null> {
    const escalation: EscalationEvent = {
      jobId: job._id.toString(),
      reason: EscalationReason.HIGH_FRAUD_SCORE,
      severity: job.riskScore! >= 90 ? "critical" : "high",
      action: job.riskScore! >= 90
        ? "AUTO-REJECT: Job rejected due to critical fraud indicators. Client refunded and notified."
        : "HOLD FOR REVIEW: Escrow held pending admin approval. Client identity verification recommended.",
      metadata: {
        riskScore: job.riskScore,
        fraudFlags: job.fraudFlags || [],
      },
      createdAt: new Date(),
    };

    await activityRepository.log({
      userId: clientId,
      eventType: "job_rejected",
      jobId: job._id.toString(),
      metadata: {
        escalation_reason: escalation.reason,
        escalation_severity: escalation.severity,
        riskScore: job.riskScore,
      },
    });

    return escalation;
  }

  /**
   * Check client dispute history
   */
  private async checkClientDisputeHistory(clientId: string): Promise<number> {
    // TODO: Query dispute repository when available
    // For now, return 0 (no active disputes)
    return 0;
  }

  /**
   * Handle client with high dispute history
   */
  private async handleClientDisputeHistory(
    job: IJob,
    clientId: string,
    disputeCount: number
  ): Promise<EscalationEvent | null> {
    const escalation: EscalationEvent = {
      jobId: job._id.toString(),
      reason: EscalationReason.CLIENT_DISPUTE_HISTORY,
      severity: "medium",
      action: `Client has ${disputeCount} open disputes. Require payment verification before escrow funding.`,
      metadata: {
        clientDisputes: disputeCount,
      },
      createdAt: new Date(),
    };

    await activityRepository.log({
      userId: clientId,
      eventType: "dispute_opened",
      jobId: job._id.toString(),
      metadata: {
        escalation_reason: escalation.reason,
        escalation_severity: escalation.severity,
      },
    });

    return escalation;
  }

  /**
   * Check for suspicious keywords/patterns in job content
   */
  private hasSuspiciousFlags(job: IJob): boolean {
    const suspiciousKeywords = [
      "free",
      "bitcoin",
      "crypto",
      "western union",
      "wire transfer",
      "upfront payment",
      "no questions asked",
    ];

    const content = `${job.title} ${job.description}`.toLowerCase();
    return suspiciousKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * Handle suspicious content in job
   */
  private async handleSuspiciousFlags(
    job: IJob,
    clientId: string
  ): Promise<EscalationEvent | null> {
    const escalation: EscalationEvent = {
      jobId: job._id.toString(),
      reason: EscalationReason.SAFETY_CONCERN,
      severity: "medium",
      action: "Job flagged for suspicious content. Requires admin review before posting to marketplace.",
      metadata: {
        flagedTime: new Date(),
      },
      createdAt: new Date(),
    };

    await activityRepository.log({
      userId: clientId,
      eventType: "job_rejected",
      jobId: job._id.toString(),
      metadata: {
        escalation_reason: escalation.reason,
        escalation_severity: escalation.severity,
      },
    });

    return escalation;
  }

  /**
   * Handle high-budget jobs
   */
  private async handleHighBudgetJob(
    job: IJob,
    clientId: string
  ): Promise<EscalationEvent | null> {
    const escalation: EscalationEvent = {
      jobId: job._id.toString(),
      reason: EscalationReason.PAYMENT_ISSUE,
      severity: "low",
      action: "High-budget job (₱${job.budget}) flagged for optional admin notification. Proceed with standard escrow flow unless other red flags present.",
      metadata: {
        budget: job.budget,
      },
      createdAt: new Date(),
    };

    await activityRepository.log({
      userId: clientId,
      eventType: "admin_ledger_entry",
      jobId: job._id.toString(),
      metadata: {
        escalation_reason: escalation.reason,
        escalation_severity: escalation.severity,
        budget: job.budget,
      },
    });

    return escalation;
  }
}

export const escalationService = new EscalationService();
