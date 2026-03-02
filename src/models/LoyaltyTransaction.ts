import mongoose, { Schema, Document, Model } from "mongoose";
import type { ILoyaltyTransaction } from "@/types";

export interface LoyaltyTransactionDocument extends Omit<ILoyaltyTransaction, "_id">, Document {}

const LoyaltyTransactionSchema = new Schema<LoyaltyTransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "earned_job",
        "earned_first_job",
        "earned_referral",
        "earned_review",
        "redeemed",
        "credit_applied",
      ],
      required: true,
    },
    points: { type: Number, required: true },
    credits: { type: Number, default: 0 },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LoyaltyTransactionSchema.index({ userId: 1, createdAt: -1 });

const LoyaltyTransaction: Model<LoyaltyTransactionDocument> =
  mongoose.models.LoyaltyTransaction ??
  mongoose.model<LoyaltyTransactionDocument>("LoyaltyTransaction", LoyaltyTransactionSchema);

export default LoyaltyTransaction;
