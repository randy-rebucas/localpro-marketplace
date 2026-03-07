import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWalletDoc {
  userId: mongoose.Types.ObjectId;
  balance: number;
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
  },
  { timestamps: true }
);

const Wallet: Model<WalletDocument> =
  mongoose.models.Wallet ??
  mongoose.model<WalletDocument>("Wallet", WalletSchema);

export default Wallet;
