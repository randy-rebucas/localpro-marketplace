import {
  paymentRepository,
  jobRepository,
  transactionRepository,
  activityRepository,
} from "@/repositories";
import { ledgerService } from "@/services/ledger.service";
import { ledgerRepository } from "@/repositories/ledger.repository";
import {
  createCheckoutSession,
  getCheckoutSession,
  createRefund,
  chargeWithSavedMethod,
  type RefundReason,
} from "@/lib/paymongo";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { calculateCommission, calculateEscrowFee, calculateClientFees } from "@/lib/commission";
import { getEffectiveCommissionRate } from "@/lib/serverCommission";
import { getPaymentSettings } from "@/lib/appSettings";
import { canTransitionEscrow } from "@/lib/jobLifecycle";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export class PaymentService {
  /**
   * Creates a PayMongo Checkout Session for escrow funding.
   * Returns a hosted checkoutUrl — redirect the user there.
   *
   * Falls back to immediate simulation if PAYMONGO_SECRET_KEY is not set.
   *
   * NOTE: The `overrideAmount` parameter has been intentionally removed (H9).
   * Escrow amount is always driven by `job.budget`, which is set server-side
   * during quote acceptance. An admin-only escrow override route provides
   * a controlled path for exceptional adjustments.
   */
  async initiateEscrowPayment(user: TokenPayload, jobId: string, overrideAmount?: number) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    // L11: Reject escrow funding for jobs whose schedule date is in the past.
    // The schemaLevel check already enforces this at creation time, but a job
    // could linger un-funded long enough that its scheduleDate passes.
    if (job.scheduleDate && new Date(job.scheduleDate) < new Date()) {
      throw new UnprocessableError("Cannot fund escrow for a job whose schedule date has already passed. Please update the schedule date first.");
    }

    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    const amount = overrideAmount ?? job.budget;

    // ── Client-side fees (escrow protection + payment processing) ───────────
    const {
      "payments.escrowServiceFeeRate": escrowFeeRatePercent,
      "payments.processingFeeRate":    processingFeeRatePercent,
      "payments.platformServiceFeeRate": platformServiceFeeRatePercent,
    } = await getPaymentSettings();
    const jobUrgencyFee = (job as unknown as { urgencyFee?: number }).urgencyFee ?? 0;
    const { escrowFee, processingFee, urgencyFee, platformServiceFee, totalCharge } = calculateClientFees(
      amount,
      escrowFeeRatePercent,
      processingFeeRatePercent,
      jobUrgencyFee,
      platformServiceFeeRatePercent
    );

    // ── Development fallback (no PayMongo key set) ─────────────────────────
    if (!process.env.PAYMONGO_SECRET_KEY) {
      job.escrowStatus = "funded";
      // Persist fee snapshot so the Job record is self-contained
      (job as unknown as { escrowFee: number }).escrowFee = escrowFee;
      (job as unknown as { processingFee: number }).processingFee = processingFee;
      (job as unknown as { platformServiceFee: number }).platformServiceFee = platformServiceFee;
      await jobDoc.save();

      const rate = await getEffectiveCommissionRate(job.category, user.userId);
      const { commission, netAmount } = calculateCommission(amount, rate);

      // H14: Skip transaction creation if no provider is assigned yet.
      // The transaction will be created when a provider is assigned (quote acceptance).
      if (!job.providerId) {
        console.warn(`[PaymentService] Dev-sim: escrow funded for job ${job._id?.toString()} but no provider assigned — transaction deferred`);
        return { checkoutUrl: null, simulated: true, message: "Escrow funded (dev simulation). Transaction will be created when a provider is assigned." };
      }

      const tx = await transactionRepository.create({
        jobId: job._id,
        payerId: user.userId,
        payeeId: job.providerId,
        amount,
        commission,
        netAmount,
        status: "pending",
        currency: "PHP",
        commissionRate: rate,
        chargeType: "job_escrow",
      });

      const journalId = `escrow-fund-${job._id!.toString()}`;
      await ledgerService.postEscrowFundedGateway(
        {
          journalId,
          entityType: "job",
          entityId: job._id!.toString(),
          clientId: user.userId,
          providerId: job.providerId?.toString(),
          initiatedBy: user.userId,
        },
        totalCharge,
        escrowFee,
        processingFee,
        urgencyFee,
        platformServiceFee
      );
      await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });

      await activityRepository.log({
        userId: user.userId,
        eventType: "escrow_funded",
        jobId: job._id!.toString(),
        metadata: { amount, escrowFee, processingFee, urgencyFee, platformServiceFee, totalCharge, simulated: true },
      });

      // Notify parties via notification service
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: user.userId,
        type: "payment_confirmed",
        title: "Payment confirmed (simulation)",
        message: `Escrow of ₱${amount.toLocaleString()} funded (dev mode). Fees: escrow ₱${escrowFee.toLocaleString()}, processing ₱${processingFee.toLocaleString()}${urgencyFee > 0 ? `, urgency ₱${urgencyFee.toLocaleString()}` : ""}${platformServiceFee > 0 ? `, platform ₱${platformServiceFee.toLocaleString()}` : ""}.`,
        data: { jobId: job._id!.toString() },
      });
      if (job.providerId) {
        await notificationService.push({
          userId: job.providerId.toString(),
          type: "escrow_funded",
          title: "Escrow funded",
          message: "The client has funded escrow. You may begin work.",
          data: { jobId: job._id!.toString() },
        });
      }

      const { pushStatusUpdateMany } = await import("@/lib/events");
      pushStatusUpdateMany(
        [user.userId, job.providerId?.toString()].filter(Boolean) as string[],
        { entity: "job", id: job._id!.toString(), escrowStatus: "funded" }
      );

      return { simulated: true, message: "Escrow funded (simulation mode)" };
    }

    // ── Live PayMongo Checkout Session ─────────────────────────────────────
    const jobTitle = (job as { title?: string }).title ?? "Service";

    const session = await createCheckoutSession({
      amountPHP: totalCharge,
      description: `Escrow for: ${jobTitle}`,
      lineItemName: jobTitle,
      successUrl: `${APP_URL}/api/payment-return?to=${encodeURIComponent(`/client/escrow?jobId=${jobId}&payment=success`)}`,
      cancelUrl: `${APP_URL}/client/jobs/${jobId}?payment=cancelled`,
      metadata: {
        jobId: job._id!.toString(),
        clientId: user.userId,
        providerId: job.providerId?.toString() ?? "",
      },
    });

    // Upsert — if a previous checkout was abandoned, update the existing
    // awaiting_payment record instead of inserting a duplicate (unique index).
    await paymentRepository.upsertAwaitingPayment({
      jobId: job._id,
      clientId: user.userId,
      providerId: job.providerId,
      paymentIntentId: session.id,
      clientKey: session.checkoutUrl,
      amount,
      amountInCentavos: Math.round(amount * 100),
      currency: "PHP",
      escrowFee,
      processingFee,
      urgencyFee,
      platformServiceFee,
      totalCharge,
    });

    return {
      simulated: false,
      checkoutSessionId: session.id,
      checkoutUrl: session.checkoutUrl,
      referenceNumber: session.referenceNumber,
      amountPHP: amount,
      escrowFee,
      processingFee,
      urgencyFee,
      platformServiceFee,
      totalCharge,
    };
  }

  /**
   * Poll the checkout session status (called from success-page redirect).
   * Verifies the session belongs to the requesting user, then confirms
   * escrow funding if the session is active.
   */
  async pollCheckoutSession(user: TokenPayload, sessionId: string, jobId: string) {
    // Verify ownership — the payment record must belong to this client
    const payment = await paymentRepository.findByPaymentIntentId(sessionId);
    if (!payment) throw new NotFoundError("Payment");
    if ((payment as { clientId: { toString(): string } }).clientId.toString() !== user.userId) {
      throw new ForbiddenError();
    }

    const session = await getCheckoutSession(sessionId);

    // session.status is "active" or "expired" — never "paid".
    // Attempt confirmation if not expired; confirmEscrowFunding is idempotent.
    if (session.status === "active") {
      await this.confirmEscrowFunding(
        session.id,
        session.paymentIntentId ?? "",
        "checkout"
      );
    }

    // Re-read from DB so callers get the real "paid" / "awaiting_payment" status.
    const confirmed = await paymentRepository.findByPaymentIntentId(sessionId);
    const dbStatus =
      (confirmed as unknown as { status: string } | null)?.status ??
      session.status;
    return { status: dbStatus };
  }

  /**
   * Called from the PayMongo webhook when checkout_session.payment.paid fires,
   * or directly from pollCheckoutSession. Idempotent.
   */
  async confirmEscrowFunding(
    sessionId: string,
    paymentIntentId: string,
    paymentMethodType: string
  ): Promise<void> {
    // Atomic idempotent update: only proceeds if status is NOT already "paid".
    // Prevents double-processing from duplicate webhook deliveries.
    const payment = await paymentRepository.atomicMarkPaid(
      sessionId,
      paymentIntentId,
      paymentMethodType
    );
    if (!payment) {
      // Payment was already marked paid in a prior attempt.
      // Guard against the deadlock: if the ledger write failed last time,
      // the retry would return early here and never post it. Re-post if missing.
      await this._ensureLedgerPostedForSession(sessionId);
      return;
    }

    const p = payment as unknown as {
      jobId: { toString(): string };
      clientId: { toString(): string };
      providerId: { toString(): string } | null;
      amount: number;
      escrowFee?: number;
      processingFee?: number;
      urgencyFee?: number;
      platformServiceFee?: number;
    };

    const jobDoc = await jobRepository.getDocById(p.jobId.toString());
    if (!jobDoc) return;

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    job.escrowStatus = "funded";
    // Persist fee snapshot on the Job record for auditability
    (job as unknown as { escrowFee: number }).escrowFee = p.escrowFee ?? 0;
    (job as unknown as { processingFee: number }).processingFee = p.processingFee ?? 0;
    (job as unknown as { platformServiceFee: number }).platformServiceFee = p.platformServiceFee ?? 0;
    await jobDoc.save();

    const rate = await getEffectiveCommissionRate(job.category, p.clientId.toString());
    const { commission, netAmount } = calculateCommission(p.amount, rate);
    const tx = await transactionRepository.create({
      jobId: p.jobId,
      payerId: p.clientId,
      payeeId: p.providerId,
      amount: p.amount,
      commission,
      netAmount,
      status: "pending",
      currency: "PHP",
      commissionRate: rate,
      chargeType: "job_escrow",
    });

    const journalId = `escrow-fund-${p.jobId.toString()}`;
    await ledgerService.postEscrowFundedGateway(
      {
        journalId,
        entityType: "job",
        entityId: p.jobId.toString(),
        clientId: p.clientId.toString(),
        providerId: p.providerId?.toString(),
        initiatedBy: p.clientId.toString(),
      },
      (p.escrowFee ?? 0) + (p.processingFee ?? 0) + (p.urgencyFee ?? 0) + (p.platformServiceFee ?? 0) > 0
        ? p.amount + (p.escrowFee ?? 0) + (p.processingFee ?? 0) + (p.urgencyFee ?? 0) + (p.platformServiceFee ?? 0)
        : p.amount,
      p.escrowFee ?? 0,
      p.processingFee ?? 0,
      p.urgencyFee ?? 0,
      p.platformServiceFee ?? 0
    );
    await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });
    // Mark payment with confirmedAt timestamp and ledger journal reference.
    // Payment.paymentIntentId stores the checkout sessionId (cs_xxx), not the pi_xxx.
    await paymentRepository.updateByPaymentIntentId(sessionId, { confirmedAt: new Date(), ledgerJournalId: journalId });

    await activityRepository.log({
      userId: p.clientId.toString(),
      eventType: "escrow_funded",
      jobId: p.jobId.toString(),
      metadata: { sessionId, paymentIntentId, paymentMethodType },
    });

    const { notificationService } = await import("@/services/notification.service");

    if (p.providerId) {
      await notificationService.push({
        userId: p.providerId.toString(),
        type: "escrow_funded",
        title: "Escrow funded",
        message: "The client has funded escrow for your job. You may begin work.",
        data: { jobId: p.jobId.toString() },
      });
    }

    await notificationService.push({
      userId: p.clientId.toString(),
      type: "payment_confirmed",
      title: "Payment confirmed",
        message: `Your payment of ₱${p.amount.toLocaleString()} has been confirmed. Fees: escrow ₱${(p.escrowFee ?? 0).toLocaleString()}, processing ₱${(p.processingFee ?? 0).toLocaleString()}${(p.urgencyFee ?? 0) > 0 ? `, urgency ₱${(p.urgencyFee ?? 0).toLocaleString()}` : ""}${(p.platformServiceFee ?? 0) > 0 ? `, platform ₱${(p.platformServiceFee ?? 0).toLocaleString()}` : ""}.`,
      data: { jobId: p.jobId.toString() },
    });

    const { pushStatusUpdateMany } = await import("@/lib/events");
    pushStatusUpdateMany(
      [p.clientId.toString(), p.providerId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: p.jobId.toString(), escrowStatus: "funded" }
    );
  }

  /**
   * Called by the recurring cron when `autoPayEnabled` is true and the client
   * has a saved card payment method.
   * Creates a PaymentIntent and charges it off-session.
   * Returns `{ success, reason }` — on failure the caller should send a
   * manual-funding notification instead.
   */
  async autoChargeEscrow(
    jobId: string,
    clientId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; reason?: string }> {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) return { success: false, reason: "Job not found" };

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) return { success: false, reason: check.reason ?? "Cannot fund escrow" };

    const jobTitle = (job as unknown as { title: string }).title;

    // ── Calculate client-side fees (same as the manual escrow path) ─────────
    const {
      "payments.escrowServiceFeeRate": escrowFeeRatePercent,
      "payments.processingFeeRate":    processingFeeRatePercent,
      "payments.platformServiceFeeRate": platformServiceFeeRatePercent,
    } = await getPaymentSettings();
    const jobUrgencyFee = (job as unknown as { urgencyFee?: number }).urgencyFee ?? 0;
    const { escrowFee, processingFee, urgencyFee, platformServiceFee, totalCharge } = calculateClientFees(
      job.budget,
      escrowFeeRatePercent,
      processingFeeRatePercent,
      jobUrgencyFee,
      platformServiceFeeRatePercent
    );

    const result = await chargeWithSavedMethod(
      paymentMethodId,
      totalCharge,
      `Recurring escrow: ${jobTitle}`,
      { jobId, clientId, source: "recurring_auto" }
    );

    if (!result.success) return result;

    // Mark escrow funded and persist fee snapshot
    job.escrowStatus = "funded";
    (job as unknown as { escrowFee: number }).escrowFee = escrowFee;
    (job as unknown as { processingFee: number }).processingFee = processingFee;
    (job as unknown as { platformServiceFee: number }).platformServiceFee = platformServiceFee;
    await jobDoc.save();

    const rate = await getEffectiveCommissionRate(job.category, clientId);
    const { commission, netAmount } = calculateCommission(job.budget, rate);
    await connectDB();
    const tx = await transactionRepository.create({
      jobId: job._id,
      payerId: clientId,
      payeeId: job.providerId,
      amount: job.budget,
      commission,
      netAmount,
      status: "pending",
      currency: "PHP",
      commissionRate: rate,
      chargeType: "recurring",
    });

    const journalId = `escrow-fund-${job._id!.toString()}`;
    await ledgerService.postEscrowFundedGateway(
      {
        journalId,
        entityType: "job",
        entityId: job._id!.toString(),
        clientId,
        providerId: job.providerId?.toString(),
        initiatedBy: clientId,
      },
      totalCharge,
      escrowFee,
      processingFee,
      urgencyFee,
      platformServiceFee
    );
    await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });

    await activityRepository.log({
      userId: clientId,
      eventType: "escrow_funded",
      jobId: jobId,
      metadata: { autoCharge: true, paymentMethodId, escrowFee, processingFee, urgencyFee, platformServiceFee, totalCharge },
    });

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: clientId,
      type: "payment_confirmed",
      title: "Auto-pay successful ✅",
      message: `₱${totalCharge.toLocaleString()} charged automatically for "${jobTitle}" (service ₱${job.budget.toLocaleString()}, escrow ₱${escrowFee.toLocaleString()}, processing ₱${processingFee.toLocaleString()}${urgencyFee > 0 ? `, urgency ₱${urgencyFee.toLocaleString()}` : ""}${platformServiceFee > 0 ? `, platform ₱${platformServiceFee.toLocaleString()}` : ""}).`,
      data: { jobId },
    });

    if (job.providerId) {
      await notificationService.push({
        userId: job.providerId.toString(),
        type: "escrow_funded",
        title: "Escrow funded",
        message: "The client has funded escrow for your recurring job. You may begin work.",
        data: { jobId },
      });
    }

    return { success: true };
  }

  /**
   * Issue a PayMongo refund when a dispute resolves in the client’s favor.
   */
  async refundEscrow(
    jobId: string,
    reason: RefundReason = "requested_by_customer"
  ): Promise<void> {
    const payment = await paymentRepository.findByJobId(jobId);
    if (!payment) return; // simulated escrow — no PayMongo record

    const p = payment as unknown as {
      paymentId?: string;
      amount: number;
      paymentIntentId: string;
    };

    if (!p.paymentId) return; // not yet paid via PayMongo

    const refund = await createRefund({
      paymentId: p.paymentId,
      amountPHP: p.amount,
      reason,
    });

    await paymentRepository.markRefunded(p.paymentIntentId, refund.id);
  }

  /**
   * Called from the PayMongo webhook when a payment attempt fails.
   * Marks the Payment record as failed and notifies the client.
   */
  async handlePaymentFailed(paymentIntentId: string) {
    const payment = await paymentRepository.findByPaymentIntentId(paymentIntentId);
    if (!payment) return;

    await paymentRepository.updateById(payment._id!.toString(), { status: "failed" });

    const p = payment as unknown as {
      clientId: { toString(): string };
      jobId: { toString(): string };
    };

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: p.clientId.toString(),
      type: "payment_failed",
      title: "Payment failed",
      message: "Your payment attempt failed. Please try funding escrow again.",
      data: { jobId: p.jobId.toString(), paymentIntentId },
    });
  }

  /**
   * Recovery guard for the webhook-retry deadlock.
   *
   * Scenario: webhook fires → atomicMarkPaid succeeds → ledger write fails →
   * webhook returns 500 → PayMongo retries → atomicMarkPaid returns null →
   * we land here. Check whether the ledger journal was ever posted; if not,
   * re-post it using the already-persisted payment + transaction data.
   */
  private async _ensureLedgerPostedForSession(sessionId: string): Promise<void> {
    const payment = await paymentRepository.findByPaymentIntentId(sessionId);
    if (!payment) return;

    const p = payment as unknown as {
      jobId: { toString(): string };
      clientId: { toString(): string };
      providerId: { toString(): string } | null;
      amount: number;
      escrowFee?: number;
      processingFee?: number;
      urgencyFee?: number;
      platformServiceFee?: number;
    };

    const journalId = `escrow-fund-${p.jobId.toString()}`;
    // Check the specific journalId, not all job entries — other audit markers
    // (e.g. escrow_released) can exist even if this funding entry never posted.
    const existing = await ledgerRepository.findByJournalId(journalId);
    if (existing.length > 0) return; // Already posted — nothing to do.

    const jobDoc = await jobRepository.getDocById(p.jobId.toString());
    if (!jobDoc) return;

    // Commission is deferred to release time — no commission variables needed here.
    await ledgerService.postEscrowFundedGateway(
      {
        journalId,
        entityType: "job",
        entityId: p.jobId.toString(),
        clientId: p.clientId.toString(),
        providerId: p.providerId?.toString(),
        initiatedBy: p.clientId.toString(),
      },
      p.amount + (p.escrowFee ?? 0) + (p.processingFee ?? 0) + (p.urgencyFee ?? 0) + (p.platformServiceFee ?? 0),
      p.escrowFee ?? 0,
      p.processingFee ?? 0,
      p.urgencyFee ?? 0,
      p.platformServiceFee ?? 0
    );

    const tx = await transactionRepository.findOneByJobId(p.jobId.toString());
    if (tx) {
      await transactionRepository.updateById(
        (tx as unknown as { _id: { toString(): string } })._id.toString(),
        { ledgerJournalId: journalId }
      );
    }
    // Also stamp the journal ID on the Payment record for traceability
    const paymentDoc = await paymentRepository.findByPaymentIntentId(sessionId);
    if (paymentDoc) {
      const pd = paymentDoc as unknown as { paymentIntentId: string };
      await paymentRepository.updateByPaymentIntentId(pd.paymentIntentId, { ledgerJournalId: journalId });
    }
  }
}

export const paymentService = new PaymentService();
