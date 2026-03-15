import Payment from "@/models/Payment";
import type { PaymentDocument } from "@/models/Payment";
import { Types } from "mongoose";
import { BaseRepository } from "./base.repository";

export class PaymentRepository extends BaseRepository<PaymentDocument> {
  constructor() {
    super(Payment);
  }

  async findByJobId(jobId: string): Promise<PaymentDocument | null> {
    return this.findOne({ jobId } as never);
  }

  async findByPaymentIntentId(
    paymentIntentId: string
  ): Promise<PaymentDocument | null> {
    return this.findOne({ paymentIntentId } as never);
  }

  async getDocByPaymentIntentId(
    paymentIntentId: string
  ): Promise<PaymentDocument | null> {
    await this.connect();
    return Payment.findOne({ paymentIntentId });
  }

  async markPaid(
    paymentIntentId: string,
    paymentId: string,
    paymentMethodType: string
  ): Promise<PaymentDocument | null> {
    await this.connect();
    return Payment.findOneAndUpdate(
      { paymentIntentId },
      { status: "paid", paymentId, paymentMethodType },
      { new: true }
    ).lean() as unknown as PaymentDocument | null;
  }

  /**
   * Atomic idempotent mark-paid: only updates if status is NOT already "paid".
   * Returns the updated document on success, null if already paid or not found.
   * Prevents race conditions from duplicate webhook deliveries.
   */
  async atomicMarkPaid(
    sessionId: string,
    paymentIntentId: string,
    paymentMethodType: string
  ): Promise<PaymentDocument | null> {
    await this.connect();
    return Payment.findOneAndUpdate(
      { paymentIntentId: sessionId, status: { $ne: "paid" } },
      { status: "paid", paymentId: paymentIntentId, paymentMethodType },
      { new: true }
    ).lean() as unknown as PaymentDocument | null;
  }

  async markRefunded(
    paymentIntentId: string,
    refundId: string
  ): Promise<PaymentDocument | null> {
    await this.connect();
    return Payment.findOneAndUpdate(
      { paymentIntentId },
      { status: "refunded", refundId },
      { new: true }
    ).lean() as unknown as PaymentDocument | null;
  }

  /** Mark a payment as refunded by job id (wallet-refund path — no PayMongo refundId). */
  async markRefundedByJobId(jobId: string): Promise<void> {
    await this.connect();
    await Payment.updateOne(
      { jobId: new Types.ObjectId(jobId), status: "paid" },
      { $set: { status: "refunded" } }
    );
  }

  /** Update arbitrary fields on a payment record by paymentIntentId. */
  async updateByPaymentIntentId(
    paymentIntentId: string,
    update: Record<string, unknown>
  ): Promise<PaymentDocument | null> {
    await this.connect();
    return Payment.findOneAndUpdate(
      { paymentIntentId },
      { $set: update },
      { new: true }
    ).lean() as unknown as PaymentDocument | null;
  }

  /**
   * Create or update the single awaiting_payment record for a job+client.
   * If the client retries after abandoning a previous checkout session,
   * the existing record is updated with the new session details instead of
   * inserting a duplicate (which would hit the unique partial index).
   */
  async upsertAwaitingPayment(data: {
    jobId: unknown;
    clientId: string;
    providerId: unknown;
    paymentIntentId: string;
    clientKey: string;
    amount: number;
    amountInCentavos: number;
    currency: string;
    /** Non-refundable escrow service fee charged to the client (PHP). */
    escrowFee?: number;
    /** Non-refundable payment processing fee charged to the client (PHP). */
    processingFee?: number;
    /** Flat urgent booking fee charged at checkout (PHP). Non-refundable. */
    urgencyFee?: number;
    /** Non-refundable client-side platform service fee charged at checkout (PHP). */
    platformServiceFee?: number;
    /** Total charged at checkout = amount + escrowFee + processingFee + urgencyFee + platformServiceFee (PHP). */
    totalCharge?: number;
  }): Promise<PaymentDocument> {
    await this.connect();
    const doc = await Payment.findOneAndUpdate(
      {
        jobId: new Types.ObjectId(String(data.jobId)),
        clientId: new Types.ObjectId(data.clientId),
        status: "awaiting_payment",
      },
      {
        $set: {
          paymentIntentId: data.paymentIntentId,
          clientKey: data.clientKey,
          amount: data.amount,
          amountInCentavos: data.amountInCentavos,
          currency: data.currency,
          providerId: data.providerId ? new Types.ObjectId(String(data.providerId)) : null,
          ...(data.escrowFee    !== undefined && { escrowFee:    data.escrowFee }),
          ...(data.processingFee !== undefined && { processingFee: data.processingFee }),
          ...(data.urgencyFee         !== undefined && { urgencyFee:         data.urgencyFee }),
          ...(data.platformServiceFee  !== undefined && { platformServiceFee: data.platformServiceFee }),
          ...(data.totalCharge         !== undefined && { totalCharge:        data.totalCharge }),
        },
        $setOnInsert: {
          status: "awaiting_payment",
        },
      },
      { new: true, upsert: true }
    ).lean() as unknown as PaymentDocument;
    return doc;
  }

  /** Batch fetch: returns a jobId → amount map for all paid payments in the given job ID list. */
  async findAmountsByJobIds(jobIds: string[]): Promise<Map<string, number>> {
    if (jobIds.length === 0) return new Map();
    await this.connect();
    const rows = await Payment.find(
      { jobId: { $in: jobIds.map((id) => new Types.ObjectId(id)) }, status: "paid" },
      { jobId: 1, amount: 1 }
    ).lean() as Array<{ jobId: { toString(): string }; amount: number }>;
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.jobId.toString(), r.amount);
    return map;
  }
}

export const paymentRepository = new PaymentRepository();
