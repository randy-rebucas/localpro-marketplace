import mongoose, { Schema, Document, Model } from "mongoose";

// ── BidCreditAccount ─────────────────────────────────────────────────────────
// Tracks the bid credit token balance for a provider.
// Credits are integer units — each quote submission costs 1 credit when mode is "bid_credits".

export interface IBidCreditAccount {
  _id?: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  balance: number; // integer token count
  createdAt: Date;
  updatedAt: Date;
}

export interface BidCreditAccountDocument extends Omit<IBidCreditAccount, "_id">, Document {}

const BidCreditAccountSchema = new Schema<BidCreditAccountDocument>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance:    { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const BidCreditAccount: Model<BidCreditAccountDocument> =
  mongoose.models.BidCreditAccount ??
  mongoose.model<BidCreditAccountDocument>("BidCreditAccount", BidCreditAccountSchema);

export default BidCreditAccount;

// ── BidCreditTransaction (audit log) ─────────────────────────────────────────
export type BidCreditTxType = "purchase" | "spend" | "admin_grant" | "admin_deduct";

export interface IBidCreditTransaction {
  _id?: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  type: BidCreditTxType;
  delta: number;          // positive = credit, negative = debit
  balanceAfter: number;
  description: string;
  walletTxId?: string | null;
  paymongoSessionId?: string | null;
  quoteId?: string | null;
  createdAt: Date;
}

export interface BidCreditTransactionDocument extends Omit<IBidCreditTransaction, "_id">, Document {}

const BidCreditTransactionSchema = new Schema<BidCreditTransactionDocument>(
  {
    providerId:        { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:              { type: String, enum: ["purchase", "spend", "admin_grant", "admin_deduct"], required: true },
    delta:             { type: Number, required: true },
    balanceAfter:      { type: Number, required: true, min: 0 },
    description:       { type: String, required: true },
    walletTxId:        { type: String, default: null },
    paymongoSessionId: { type: String, default: null },
    quoteId:           { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BidCreditTransactionSchema.index({ providerId: 1, createdAt: -1 });

export const BidCreditTransaction: Model<BidCreditTransactionDocument> =
  mongoose.models.BidCreditTransaction ??
  mongoose.model<BidCreditTransactionDocument>("BidCreditTransaction", BidCreditTransactionSchema);
