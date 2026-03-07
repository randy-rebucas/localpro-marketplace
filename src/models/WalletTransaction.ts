import mongoose, { Schema, Document, Model } from "mongoose";

export type WalletTxType =
  | "refund_credit"      // escrow refunded back to wallet
  | "escrow_payment"     // wallet used to fund escrow
  | "withdrawal"         // withdrawal request deducted
  | "withdrawal_reversed"// rejection reverses a pending withdrawal
  | "admin_credit"
  | "admin_debit";

export interface IWalletTransactionDoc {
  userId: mongoose.Types.ObjectId;
  type: WalletTxType;
  amount: number;
  balanceAfter: number;
  description: string;
  jobId?: mongoose.Types.ObjectId | null;
  refId?: string | null;  // e.g. withdrawalId or PayMongo refundId
  createdAt: Date;
}

export interface WalletTransactionDocument extends IWalletTransactionDoc, Document {}

const WalletTransactionSchema = new Schema<WalletTransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["refund_credit", "escrow_payment", "withdrawal", "withdrawal_reversed", "admin_credit", "admin_debit"],
      required: true,
    },
    amount:       { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description:  { type: String, required: true },
    jobId:        { type: Schema.Types.ObjectId, ref: "Job", default: null },
    refId:        { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction: Model<WalletTransactionDocument> =
  mongoose.models.WalletTransaction ??
  mongoose.model<WalletTransactionDocument>("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;
