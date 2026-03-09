import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWalletDoc {
  userId: mongoose.Types.ObjectId;
  balance: number;
  reservedAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletDocument extends IWalletDoc, Document {}

const WalletSchema = new Schema<WalletDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    /** Amount locked for in-flight withdrawals — prevents double-spend */
    reservedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: { type: String, default: "PHP" },
  },
  { timestamps: true }
);

const Wallet: Model<WalletDocument> =
  mongoose.models.Wallet ??
  mongoose.model<WalletDocument>("Wallet", WalletSchema);

export default Wallet;
