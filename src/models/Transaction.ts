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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TransactionSchema.index({ payeeId: 1, createdAt: -1 });
TransactionSchema.index({ payerId: 1, createdAt: -1 });

const Transaction: Model<TransactionDocument> =
  mongoose.models.Transaction ??
  mongoose.model<TransactionDocument>("Transaction", TransactionSchema);

export default Transaction;
