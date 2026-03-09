import mongoose, { Schema, Document, Model } from "mongoose";
import type { ITransaction } from "@/types";

export interface TransactionDocument extends Omit<ITransaction, "_id">, Document {}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      default: "pending",
    },
    currency: { type: String, default: "PHP" },
    commissionRate: { type: Number, default: null },
    chargeType: {
      type: String,
      enum: ["job_escrow", "milestone_release", "partial_release", "recurring"],
      default: "job_escrow",
    },
    ledgerJournalId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes that cover status+payeeId/payerId for dashboard queries
TransactionSchema.index({ payeeId: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ payerId: 1, status: 1, createdAt: -1 });
// Compound index for revenue aggregation & admin stats (filter by status first)
TransactionSchema.index({ status: 1, createdAt: -1 });

const Transaction: Model<TransactionDocument> =
  mongoose.models.Transaction ??
  mongoose.model<TransactionDocument>("Transaction", TransactionSchema);

export default Transaction;
