import {
  disputeRepository,
  jobRepository,
  transactionRepository,
  activityRepository,
  notificationRepository,
} from "@/repositories";
import { ledgerService } from "@/services/ledger.service";
import { pushNotification, pushStatusUpdateMany } from "@/lib/events";
import { NotFoundError, ForbiddenError, UnprocessableError, assertObjectId } from "@/lib/errors";
import { getPaymentSettings } from "@/lib/appSettings";
import { calculateDisputeHandlingFee } from "@/lib/commission";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

export interface OpenDisputeInput {
  jobId: string;
  reason: string;
  evidence?: string[];
}

export interface ResolveDisputeInput {
  status: "investigating" | "resolved";
  resolutionNotes?: string;
  escrowAction?: "release" | "refund";
  /** When true (and dispute was escalated), charge the flat case handling fee. */
  chargeHandlingFee?: boolean;
  /** Which party to charge: client, provider, or both. */
  handlingFeeChargedTo?: "client" | "provider" | "both";
}

export class DisputeService {
  async listDisputes(user: TokenPayload) {
    const filter = user.role === "admin" ? {} : { raisedBy: user.userId };
    return disputeRepository.findWithPopulation(filter as never);
  }

  async openDispute(user: TokenPayload, input: OpenDisputeInput) {
    assertObjectId(input.jobId, "jobId");
    const jobDoc = await jobRepository.getDocById(input.jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & {
      clientId: { toString(): string };
      providerId?: { toString(): string } | null;
      save(): Promise<void>;
    };

    const isClient = job.clientId.toString() === user.userId;
    const isProvider = job.providerId?.toString() === user.userId;
    if (!isClient && !isProvider) throw new ForbiddenError();

    // Disputes cannot be raised once escrow has been released (C7 — phantom refund prevention)
    if (job.escrowStatus === "released") {
      throw new UnprocessableError("A dispute cannot be raised after escrow has already been released");
    }

    if (!["assigned", "in_progress", "completed"].includes(job.status)) {
      throw new UnprocessableError("Disputes can only be raised on active jobs");
    }

    // Check for existing open/investigating dispute from this user on this job (C6)
    const existingDispute = await disputeRepository.findOne({
      jobId: input.jobId,
      raisedBy: user.userId,
      status: { $in: ["open", "investigating"] },
    } as never);
    if (existingDispute) {
      throw new UnprocessableError("You already have an open dispute for this job");
    }

    const dispute = await disputeRepository.create({
      jobId: input.jobId,
      raisedBy: user.userId,
      reason: input.reason,
      ...(input.evidence?.length ? { evidence: input.evidence } : {}),
    });

    job.status = "disputed";
    await jobDoc.save();

    await activityRepository.log({
      userId: user.userId,
      eventType: "dispute_opened",
      jobId: input.jobId,
    });

    // Notify the other party
    const otherPartyId = isClient ? job.providerId?.toString() : job.clientId.toString();
    if (otherPartyId) {
      const notification = await notificationRepository.create({
        userId: otherPartyId,
        type: "dispute_opened",
        title: "A dispute has been opened",
        message: "A dispute was raised on one of your jobs. An admin will review it.",
        data: { jobId: input.jobId, disputeId: dispute._id!.toString() },
      });
      pushNotification(otherPartyId, notification);
    }

    pushStatusUpdateMany(
      [job.clientId.toString(), job.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: input.jobId, status: "disputed" }
    );

    // ── AI-powered dispute analysis with Dispute Resolver agent ─────────────
    // This runs asynchronously to not block dispute creation
    this.analyzeDisputeWithAI(
      dispute._id!.toString(),
      input.jobId,
      job.budget,
      input.reason,
      input.evidence,
      isClient ? "client" : "provider",
      user.userId
    ).catch((err) => console.error("[DisputeService] AI analysis failed (non-blocking):", err));

    return dispute;
  }

  async getDispute(disputeId: string) {
    const dispute = await disputeRepository.findByIdPopulated(disputeId);
    if (!dispute) throw new NotFoundError("Dispute");
    return dispute;
  }

  async resolveDispute(
    adminUserId: string,
    disputeId: string,
    input: ResolveDisputeInput
  ) {
    assertObjectId(disputeId, "disputeId");
    const disputeDoc = await disputeRepository.getDocById(disputeId);
    if (!disputeDoc) throw new NotFoundError("Dispute");

    const d = disputeDoc as unknown as {
      status: string;
      resolutionNotes: string;
      jobId: { toString(): string };
      raisedBy: { toString(): string };
      wasEscalated: boolean;
      losingParty: string | null;
      handlingFeeAmount: number;
      handlingFeePaid: boolean;
      save(): Promise<void>;
    };

    // Track escalation: once a dispute reaches "investigating", the handling fee becomes eligible
    if (input.status === "investigating") {
      d.wasEscalated = true;
    }

    d.status = input.status;
    if (input.resolutionNotes) d.resolutionNotes = input.resolutionNotes;
    await disputeDoc.save();

    const jobDoc = await jobRepository.getDocById(d.jobId.toString());
    if (jobDoc && input.status === "resolved" && input.escrowAction) {
      const job = jobDoc as unknown as IJob & {
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        save(): Promise<void>;
      };

      if (input.escrowAction === "release") {
        job.escrowStatus = "released";
        job.status = "completed";
        await transactionRepository.setPending(job._id!.toString(), "completed");

        // Post ledger: dispute resolved in provider's favour (revenue recognition)
        try {
          const tx = await transactionRepository.findOneByJobId(job._id!.toString());
          if (tx) {
            const t = tx as unknown as { amount: number; commission: number; netAmount: number };
            await ledgerService.postDisputeReleaseToProvider(
              {
                journalId: `dispute-release-${disputeId}`,
                entityType: "dispute",
                entityId: disputeId,
                clientId: job.clientId.toString(),
                providerId: job.providerId?.toString(),
                initiatedBy: adminUserId,
              },
              t.amount, t.commission, t.netAmount
            );
          }
        } catch { /* non-critical */ }
      } else {
        const budget = (job as unknown as { budget: number }).budget;
        job.escrowStatus = "refunded";
        job.status = "refunded";
        await transactionRepository.setPending(job._id!.toString(), "refunded");

        // Credit the client's platform wallet (faster than PayMongo reversal)
        const { walletService } = await import("@/services/wallet.service");
        const { paymentRepository } = await import("@/repositories");

        // Post ledger: dispute refund to client
        try {
          const tx = await transactionRepository.findOneByJobId(job._id!.toString());
          // Use t.amount (what was actually paid), not job.budget which may differ
          // if the client used overrideAmount at payment time.
          const refundAmount = tx ? (tx as unknown as { amount: number }).amount : budget;
          const journalId = `dispute-refund-${disputeId}`;
          await walletService.credit(
            job.clientId.toString(),
            refundAmount,
            `Refund for disputed job (dispute resolved in your favour)`,
            { jobId: job._id!.toString(), silent: true, journalId }
          );
          await paymentRepository.markRefundedByJobId(job._id!.toString());

          if (tx) {
            const t = tx as unknown as { amount: number };
            // Simplified: move gross from 2000 Escrow Payable → 2200 Wallet Payable.
            // No commission reversal needed — revenue was never recognised at funding.
            await ledgerService.postDisputeRefund(
              {
                journalId,
                entityType: "dispute",
                entityId: disputeId,
                clientId: job.clientId.toString(),
                providerId: job.providerId?.toString(),
                initiatedBy: adminUserId,
              },
              t.amount
            );
          }
        } catch { /* non-critical */ }
      }
      await jobDoc.save();

      // Notify both parties
      const recipients = [
        job.clientId.toString(),
        job.providerId?.toString(),
      ].filter(Boolean) as string[];

      // ── Dispute Handling Fee ──────────────────────────────────────────────
      let feeCharged = false;
      let feeAmount  = 0;

      if (
        input.status === "resolved" &&
        d.wasEscalated &&
        input.chargeHandlingFee &&
        input.handlingFeeChargedTo
      ) {
        const paySettings = await getPaymentSettings();
        const { fee, isCharged } = calculateDisputeHandlingFee(
          true,
          paySettings["payments.disputeHandlingFee"]
        );

        if (isCharged && fee > 0) {
          const { walletService } = await import("@/services/wallet.service");
          const partiesToCharge: Array<{ party: "client" | "provider"; userId: string }> = [];

          if (input.handlingFeeChargedTo === "client" || input.handlingFeeChargedTo === "both") {
            partiesToCharge.push({ party: "client", userId: job.clientId.toString() });
          }
          if (
            (input.handlingFeeChargedTo === "provider" || input.handlingFeeChargedTo === "both") &&
            job.providerId
          ) {
            partiesToCharge.push({ party: "provider", userId: job.providerId.toString() });
          }

          const chargedParties: Array<"client" | "provider"> = [];

          for (const { party, userId } of partiesToCharge) {
            try {
              const result = await walletService.debit(
                userId,
                fee,
                `Dispute case handling fee — Job #${job._id!.toString()}`,
                { silent: true }
              );
              if (result.success) {
                chargedParties.push(party);
                feeAmount = fee;
                await ledgerService.postDisputeHandlingFee(
                  {
                    journalId:   `dispute-handling-fee-${disputeId}-${party}`,
                    entityType:  "dispute",
                    entityId:    disputeId,
                    clientId:    job.clientId.toString(),
                    providerId:  job.providerId?.toString(),
                    initiatedBy: adminUserId,
                  },
                  fee,
                  party
                );
              }
            } catch { /* non-critical — skip silently */ }
          }

          // Persist fee metadata — losingParty reflects who was actually debited,
          // not just who was intended, so records stay accurate when one side lacks funds.
          if (chargedParties.length > 0) {
            feeCharged = true;
            d.losingParty = chargedParties.length === 2
              ? "both"
              : chargedParties[0];
            d.handlingFeeAmount = feeAmount;
            d.handlingFeePaid   = true;
            await disputeDoc.save();
          }
        }
      }

      for (const userId of recipients) {
        const feeMsg = feeCharged && feeAmount > 0 && (
          (userId === job.clientId.toString() && (input.handlingFeeChargedTo === "client" || input.handlingFeeChargedTo === "both")) ||
          (userId === job.providerId?.toString() && (input.handlingFeeChargedTo === "provider" || input.handlingFeeChargedTo === "both"))
        ) ? ` A case handling fee of ₱${feeAmount.toLocaleString()} was deducted from your wallet.` : "";

        const notification = await notificationRepository.create({
          userId,
          type: "dispute_resolved",
          title: "Dispute resolved",
          message: (
            input.escrowAction === "release"
              ? "The dispute was resolved. Payment has been released to the provider."
              : "The dispute was resolved. A refund has been issued."
          ) + feeMsg,
          data: { jobId: d.jobId.toString(), disputeId },
        });
        pushNotification(userId, notification);
      }
    }

    await activityRepository.log({
      userId: adminUserId,
      eventType: "dispute_resolved",
      jobId: d.jobId.toString(),
    });

    // Push realtime updates to both parties
    if (jobDoc && input.status === "resolved") {
      const job2 = jobDoc as unknown as {
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
        status: string;
        escrowStatus: string;
        _id: { toString(): string };
      };
      const affected = [job2.clientId.toString(), job2.providerId?.toString()].filter(Boolean) as string[];
      pushStatusUpdateMany(affected, {
        entity: "job",
        id: job2._id.toString(),
        status: job2.status,
        escrowStatus: job2.escrowStatus,
      });
      pushStatusUpdateMany(affected, { entity: "dispute", id: disputeId });
    }

    return disputeDoc;
  }

  /**
   * Analyze dispute with AI Dispute Resolver agent
   * Generates recommended resolution and queues for admin approval
   */
  private async analyzeDisputeWithAI(
    disputeId: string,
    jobId: string,
    jobAmount: number,
    reason: string,
    evidence: string[] | undefined,
    raisedByRole: "client" | "provider",
    raisedByUserId: string
  ) {
    try {
      await connectDB();

      // Fetch additional context
      const jobDoc = await jobRepository.getDocById(jobId);
      if (!jobDoc) return;

      const job = jobDoc as unknown as IJob & {
        clientId: { toString(): string };
        providerId?: { toString(): string } | null;
      };

      const otherPartyId =
        raisedByRole === "client" ? job.providerId?.toString() : job.clientId.toString();

      // Call AI Dispute Resolver API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${appUrl}/api/ai/agents/dispute-resolver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
        body: JSON.stringify({
          disputeId,
          jobAmount,
          reason,
          evidencePhotos: evidence || [],
          raisedByRole,
          raisedByHistory: {
            // These would normally come from user profile, using defaults here
            totalDisputes: 0,
            avgDisputes: 0,
            reputation: "neutral",
          },
          otherPartyHistory: {
            // These would normally come from other party profile
            totalDisputes: 0,
            avgDisputes: 0,
            reputation: "neutral",
          },
        }),
      });

      if (!response.ok) {
        console.warn(
          "[DisputeService] AI dispute resolver returned non-OK status:",
          response.status
        );
        return;
      }

      const aiResult = await response.json();

      // All disputes queue for manual review (high financial stakes)
      // Create AIDecision record for founder approval
      await AIDecisionService.createDecision({
        type: "DISPUTE",
        agentName: "dispute_resolver",
        confidenceScore: aiResult.decision?.confidence || 0,
        riskLevel: aiResult.decision?.riskLevel || "high",
        recommendation: aiResult.decision?.recommendedResolution || "Manual review required",
        supportingEvidence: {
          fraudScore: 0,
          patternDetected: `Dispute requires resolution. Recommended: ${aiResult.decision?.recommendedResolution || "Manual review"}`,
        },
        relatedEntityType: "dispute",
        relatedEntityId: disputeId,
      });

      console.log(
        `[DisputeService] Dispute ${disputeId} queued for manual review (AI confidence: ${aiResult.decision?.confidence}%)`
      );
    } catch (error) {
      console.error("[DisputeService] AI dispute analysis failed:", error);
      // Silently fail - dispute is already created
      // Admin will manually review it through the regular dispute resolution flow
    }
  }
}

export const disputeService = new DisputeService();
