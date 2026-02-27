import Payment from "@/models/Payment";
import type { PaymentDocument } from "@/models/Payment";
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
}

export const paymentRepository = new PaymentRepository();
