import mongoose, { Schema, Document, Model } from "mongoose";

export type LeadSubscriptionStatus = "active" | "cancelled" | "expired";

export interface ILeadSubscription {
  _id?: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  status: LeadSubscriptionStatus;
  startsAt: Date;
  expiresAt: Date;
  amountPaid: number;
  walletTxId?: string | null;
  paymongoSessionId?: string | null;
  ledgerJournalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadSubscriptionDocument extends Omit<ILeadSubscription, "_id">, Document {}

const LeadSubscriptionSchema = new Schema<LeadSubscriptionDocument>(
  {
    providerId:       { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status:           { type: String, enum: ["active", "cancelled", "expired"], required: true, default: "active" },
    startsAt:         { type: Date, required: true },
    expiresAt:        { type: Date, required: true, index: true },
    amountPaid:       { type: Number, required: true, min: 0 },
    walletTxId:       { type: String, default: null },
    paymongoSessionId: { type: String, default: null },
    ledgerJournalId:  { type: String, default: null },
  },
  { timestamps: true }
);

LeadSubscriptionSchema.index({ providerId: 1, status: 1 });
LeadSubscriptionSchema.index({ status: 1, expiresAt: 1 });

const LeadSubscription: Model<LeadSubscriptionDocument> =
  mongoose.models.LeadSubscription ??
  mongoose.model<LeadSubscriptionDocument>("LeadSubscription", LeadSubscriptionSchema);

export default LeadSubscription;
