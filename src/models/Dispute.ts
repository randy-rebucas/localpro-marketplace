import mongoose, { Schema, Document, Model } from "mongoose";
import type { IDispute } from "@/types";

export interface DisputeDocument extends Omit<IDispute, "_id">, Document {}

const DisputeSchema = new Schema<DisputeDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [20, "Reason must be at least 20 characters"],
    },
    evidence: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 5,
        message: "Maximum 5 evidence images allowed",
      },
    },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved"],
      default: "open",
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    /** Set to true once the dispute transitions to "investigating" — gates the handling fee. */
    wasEscalated: { type: Boolean, default: false },
    /** Who was charged the case handling fee at resolution: client, provider, or both. */
    losingParty: {
      type: String,
      enum: ["client", "provider", "both"],
      default: null,
    },
    /** Flat handling fee charged in PHP (0 if not charged). */
    handlingFeeAmount: { type: Number, default: 0 },
    /** True if the wallet deduction succeeded for the handling fee. */
    handlingFeePaid: { type: Boolean, default: false },
    /** Timestamp of the last escalation action. */
    disputeEscalatedAt: { type: Date, default: null },
    /** Current escalation tier: provider → admin → peso. */
    disputeEscalationLevel: {
      type: String,
      enum: ["provider", "admin", "peso"],
      default: "provider",
    },
  },
  { timestamps: true }
);

DisputeSchema.index({ status: 1, createdAt: -1 });
DisputeSchema.index({ raisedBy: 1, status: 1, createdAt: -1 });
// Prevent duplicate open/investigating disputes for the same (job, user) pair.
// partialFilterExpression excludes resolved disputes so historical records are kept.
DisputeSchema.index(
  { jobId: 1, raisedBy: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["open", "investigating"] } } }
);
// Fast lookup by jobId alone is covered by index: true on the field definition

const Dispute: Model<DisputeDocument> =
  mongoose.models.Dispute ??
  mongoose.model<DisputeDocument>("Dispute", DisputeSchema);

export default Dispute;
