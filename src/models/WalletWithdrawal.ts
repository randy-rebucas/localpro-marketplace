import mongoose, { Schema, Document, Model } from "mongoose";

export type WalletWithdrawalStatus = "pending" | "processing" | "completed" | "rejected";

export interface IWalletWithdrawalDoc {
  userId: mongoose.Types.ObjectId;
  amount: number;
  status: WalletWithdrawalStatus;
  bankName: string;
  accountNumber: string;
  accountName: string;
  notes?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletWithdrawalDocument extends IWalletWithdrawalDoc, Document {}

const WalletWithdrawalSchema = new Schema<WalletWithdrawalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "rejected"],
      default: "pending",
    },
    bankName:      { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    accountName:   { type: String, required: true, trim: true },
    notes:         { type: String, default: null },
    processedAt:   { type: Date,   default: null },
  },
  { timestamps: true }
);

WalletWithdrawalSchema.index({ status: 1, createdAt: -1 });

const WalletWithdrawal: Model<WalletWithdrawalDocument> =
  mongoose.models.WalletWithdrawal ??
  mongoose.model<WalletWithdrawalDocument>("WalletWithdrawal", WalletWithdrawalSchema);

export default WalletWithdrawal;
