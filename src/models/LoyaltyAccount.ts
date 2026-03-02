import mongoose, { Schema, Document, Model } from "mongoose";
import type { ILoyaltyAccount } from "@/types";

export interface LoyaltyAccountDocument extends Omit<ILoyaltyAccount, "_id">, Document {}

const LoyaltyAccountSchema = new Schema<LoyaltyAccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    points: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0, min: 0 },
    credits: { type: Number, default: 0, min: 0 },
    tier: {
      type: String,
      enum: ["standard", "silver", "gold", "platinum"],
      default: "standard",
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralBonusAwarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const LoyaltyAccount: Model<LoyaltyAccountDocument> =
  mongoose.models.LoyaltyAccount ??
  mongoose.model<LoyaltyAccountDocument>("LoyaltyAccount", LoyaltyAccountSchema);

export default LoyaltyAccount;
