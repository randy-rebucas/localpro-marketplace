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
  },
  { timestamps: true }
);

DisputeSchema.index({ status: 1, createdAt: -1 });

const Dispute: Model<DisputeDocument> =
  mongoose.models.Dispute ??
  mongoose.model<DisputeDocument>("Dispute", DisputeSchema);

export default Dispute;
