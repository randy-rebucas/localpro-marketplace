import mongoose, { Schema, Document, Model } from "mongoose";
import type { IPayout } from "@/types";

export interface PayoutDocument extends Omit<IPayout, "_id">, Document {}

const PayoutSchema = new Schema<PayoutDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "rejected"],
      default: "pending",
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    currency:        { type: String, default: "PHP" },
    ledgerJournalId: { type: String, default: null },
    /** L21: Journal ID for the rejection ledger reversal. Preserved separately so that
     *  the original payout-requested journal ID (ledgerJournalId) is not overwritten. */
    rejectionJournalId: { type: String, default: null },
    /** Flat withdrawal fee deducted at payout request time (PHP). */
    withdrawalFee:   { type: Number, default: 0 },
    /** Whether this payout was auto-approved based on provider qualifications. */
    autoApproved:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

PayoutSchema.index({ providerId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

const Payout: Model<PayoutDocument> =
  mongoose.models.Payout ??
  mongoose.model<PayoutDocument>("Payout", PayoutSchema);

export default Payout;
