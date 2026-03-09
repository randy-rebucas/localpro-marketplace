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
import { calculateCommission } from "@/lib/commission";
import { getDbCommissionRate } from "@/lib/serverCommission";
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
   */
  async initiateEscrowPayment(user: TokenPayload, jobId: string, overrideAmount?: number) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    if (overrideAmount !== undefined && overrideAmount > job.budget * 1.2) {
      throw new UnprocessableError(
        "Override amount cannot exceed 120% of the job budget"
      );
    }

    const amount = overrideAmount ?? job.budget;

    // ── Development fallback (no PayMongo key set) ─────────────────────────
    if (!process.env.PAYMONGO_SECRET_KEY) {
      job.escrowStatus = "funded";
      await jobDoc.save();

      const rate = await getDbCommissionRate(job.category);
      const { commission, netAmount } = calculateCommission(amount, rate);
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
        amount, commission, netAmount
      );
      await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });

      await activityRepository.log({
        userId: user.userId,
        eventType: "escrow_funded",
        jobId: job._id!.toString(),
        metadata: { amount, simulated: true },
      });

      // Notify parties via notification service
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: user.userId,
        type: "payment_confirmed",
        title: "Payment confirmed (simulation)",
        message: `Escrow of ₱${amount.toLocaleString()} has been funded (dev mode).`,
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
      amountPHP: amount,
      description: `Escrow for: ${jobTitle}`,
      lineItemName: jobTitle,
      successUrl: `${APP_URL}/client/escrow?jobId=${jobId}&payment=success`,
      cancelUrl: `${APP_URL}/client/jobs/${jobId}?payment=cancelled`,
      metadata: {
        jobId: job._id!.toString(),
        clientId: user.userId,
        providerId: job.providerId?.toString() ?? "",
      },
    });

    await paymentRepository.create({
      jobId: job._id,
      clientId: user.userId,
      providerId: job.providerId,
      paymentIntentId: session.id,
      clientKey: session.checkoutUrl,
      amount,
      amountInCentavos: Math.round(amount * 100),
      currency: "PHP",
      status: "awaiting_payment",
    });

    return {
      simulated: false,
      checkoutSessionId: session.id,
      checkoutUrl: session.checkoutUrl,
      referenceNumber: session.referenceNumber,
      amountPHP: amount,
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
    };

    const jobDoc = await jobRepository.getDocById(p.jobId.toString());
    if (!jobDoc) return;

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    job.escrowStatus = "funded";
    await jobDoc.save();

    const rate = await getDbCommissionRate(job.category);
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
      p.amount, commission, netAmount
    );
    await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });
    // Mark payment with confirmedAt timestamp
    await paymentRepository.updateByPaymentIntentId(paymentIntentId, { confirmedAt: new Date() });

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
      message: `Your payment of ₱${p.amount.toLocaleString()} has been confirmed.`,
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
    const result = await chargeWithSavedMethod(
      paymentMethodId,
      job.budget,
      `Recurring escrow: ${jobTitle}`,
      { jobId, clientId, source: "recurring_auto" }
    );

    if (!result.success) return result;

    // Mark escrow funded
    job.escrowStatus = "funded";
    await jobDoc.save();

    const rate = await getDbCommissionRate(job.category);
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
      job.budget, commission, netAmount
    );
    await transactionRepository.updateById((tx as { _id: { toString(): string } })._id.toString(), { ledgerJournalId: journalId });

    await activityRepository.log({
      userId: clientId,
      eventType: "escrow_funded",
      jobId: jobId,
      metadata: { autoCharge: true, paymentMethodId },
    });

    const { notificationService } = await import("@/services/notification.service");
    await notificationService.push({
      userId: clientId,
      type: "payment_confirmed",
      title: "Auto-pay successful ✅",
      message: `₱${job.budget.toLocaleString()} escrow funded automatically for "${jobTitle}".`,
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
    };

    const journalId = `escrow-fund-${p.jobId.toString()}`;
    const existing = await ledgerRepository.countByEntity("job", p.jobId.toString());
    if (existing > 0) return; // Already posted — nothing to do.

    const jobDoc = await jobRepository.getDocById(p.jobId.toString());
    if (!jobDoc) return;

    const job = jobDoc as unknown as IJob;
    const rate = await getDbCommissionRate(job.category);
    const { commission, netAmount } = calculateCommission(p.amount, rate);

    await ledgerService.postEscrowFundedGateway(
      {
        journalId,
        entityType: "job",
        entityId: p.jobId.toString(),
        clientId: p.clientId.toString(),
        providerId: p.providerId?.toString(),
        initiatedBy: p.clientId.toString(),
      },
      p.amount, commission, netAmount
    );

    const tx = await transactionRepository.findOneByJobId(p.jobId.toString());
    if (tx) {
      await transactionRepository.updateById(
        (tx as unknown as { _id: { toString(): string } })._id.toString(),
        { ledgerJournalId: journalId }
      );
    }
  }
}

export const paymentService = new PaymentService();
