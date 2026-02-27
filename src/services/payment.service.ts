import {
  paymentRepository,
  jobRepository,
  transactionRepository,
  activityRepository,
} from "@/repositories";
import {
  createCheckoutSession,
  getCheckoutSession,
  createRefund,
  type RefundReason,
} from "@/lib/paymongo";
import { calculateCommission } from "@/lib/commission";
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
  async initiateEscrowPayment(user: TokenPayload, jobId: string) {
    const jobDoc = await jobRepository.getDocById(jobId);
    if (!jobDoc) throw new NotFoundError("Job");

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    if (job.clientId.toString() !== user.userId) throw new ForbiddenError();

    const check = canTransitionEscrow(job, "funded");
    if (!check.allowed) throw new UnprocessableError(check.reason!);

    // ── Development fallback (no PayMongo key set) ─────────────────────────
    if (!process.env.PAYMONGO_SECRET_KEY) {
      job.escrowStatus = "funded";
      await jobDoc.save();

      const { commission, netAmount } = calculateCommission(job.budget);
      await transactionRepository.create({
        jobId: job._id,
        payerId: user.userId,
        payeeId: job.providerId,
        amount: job.budget,
        commission,
        netAmount,
        status: "pending",
      });

      await activityRepository.log({
        userId: user.userId,
        eventType: "escrow_funded",
        jobId: job._id!.toString(),
        metadata: { amount: job.budget, simulated: true },
      });

      // Notify parties via notification service
      const { notificationService } = await import("@/services/notification.service");
      await notificationService.push({
        userId: user.userId,
        type: "payment_confirmed",
        title: "Payment confirmed (simulation)",
        message: `Escrow of ₱${job.budget.toLocaleString()} has been funded (dev mode).`,
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
      amountPHP: job.budget,
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
      paymentIntentId: session.id, // store session id as reference
      clientKey: session.checkoutUrl, // store checkout url in clientKey field
      amount: job.budget,
      amountInCentavos: Math.round(job.budget * 100),
      currency: "PHP",
      status: "awaiting_payment",
    });

    return {
      simulated: false,
      checkoutSessionId: session.id,
      checkoutUrl: session.checkoutUrl,
      referenceNumber: session.referenceNumber,
      amountPHP: job.budget,
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
    // Find the payment record by session id (stored in paymentIntentId field)
    const payment = await paymentRepository.getDocByPaymentIntentId(sessionId);
    if (!payment) return;

    const p = payment as unknown as {
      status: string;
      jobId: { toString(): string };
      clientId: { toString(): string };
      providerId: { toString(): string } | null;
      amount: number;
      save(): Promise<void>;
    };

    if (p.status === "paid") return; // idempotent

    await paymentRepository.markPaid(sessionId, paymentIntentId, paymentMethodType);

    const jobDoc = await jobRepository.getDocById(p.jobId.toString());
    if (!jobDoc) return;

    const job = jobDoc as unknown as IJob & { save(): Promise<void> };
    job.escrowStatus = "funded";
    await jobDoc.save();

    const { commission, netAmount } = calculateCommission(p.amount);
    await transactionRepository.create({
      jobId: p.jobId,
      payerId: p.clientId,
      payeeId: p.providerId,
      amount: p.amount,
      commission,
      netAmount,
      status: "pending",
    });

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
   * Issue a PayMongo refund when a dispute resolves in the client's favor.
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
}

export const paymentService = new PaymentService();
