import mongoose, { Schema, Document, Model } from "mongoose";
import type { IPayment } from "@/types";

export interface PaymentDocument extends Omit<IPayment, "_id">, Document {}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paymentIntentId: { type: String, required: true, unique: true },
    clientKey: { type: String, required: true },
    amount: { type: Number, required: true },
    amountInCentavos: { type: Number, required: true },
    currency: { type: String, default: "PHP" },
    status: {
      type: String,
      enum: ["awaiting_payment", "processing", "paid", "failed", "refunded"],
      default: "awaiting_payment",
    },
    paymentMethodType: { type: String, default: null },
    paymentId: { type: String, default: null },
    refundId: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ clientId: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

const Payment: Model<PaymentDocument> =
  mongoose.models.Payment ??
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);

export default Payment;
