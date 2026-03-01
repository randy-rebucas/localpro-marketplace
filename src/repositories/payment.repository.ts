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
