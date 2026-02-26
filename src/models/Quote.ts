import mongoose, { Schema, Document, Model } from "mongoose";
import type { IQuote } from "@/types";

export interface QuoteDocument extends Omit<IQuote, "_id">, Document {}

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
      min: [1, "Amount must be at least $1"],
    },
    timeline: {
      type: String,
      required: [true, "Timeline is required"],
      trim: true,
    },
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
  },
  { timestamps: true }
);

// One quote per provider per job
QuoteSchema.index({ jobId: 1, providerId: 1 }, { unique: true });

const Quote: Model<QuoteDocument> =
  mongoose.models.Quote ?? mongoose.model<QuoteDocument>("Quote", QuoteSchema);

export default Quote;
