import mongoose, { Schema, Document, Model } from "mongoose";
import type { IQuote } from "@/types";

export interface QuoteDocument extends Omit<IQuote, "_id">, Document {}

const MilestoneSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuoteSchema = new Schema<QuoteDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    proposedAmount: {
      type: Number,
      required: [true, "Proposed amount is required"],
      min: [1, "Amount must be at least ₱1"],
    },
    laborCost: { type: Number, min: 0, default: null },
    materialsCost: { type: Number, min: 0, default: null },
    timeline: {
      type: String,
      required: [true, "Timeline is required"],
      trim: true,
    },
    milestones: { type: [MilestoneSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: null },
    proposalDocUrl: { type: String, trim: true, default: null },
    sitePhotos: { type: [String], default: [] },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [20, "Message must be at least 20 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// One quote per provider per job
QuoteSchema.index({ jobId: 1, providerId: 1 }, { unique: true });

const Quote: Model<QuoteDocument> =
  mongoose.models.Quote ?? mongoose.model<QuoteDocument>("Quote", QuoteSchema);

export default Quote;
