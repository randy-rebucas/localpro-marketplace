import mongoose, { Schema, Document, Model } from "mongoose";
import type { IReview } from "@/types";

export interface ReviewDocument extends Omit<IReview, "_id">, Document {}

const ReviewSchema = new Schema<ReviewDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    breakdown: {
      type: new Schema(
        {
          quality:         { type: Number, min: 1, max: 5 },
          professionalism: { type: Number, min: 1, max: 5 },
          punctuality:     { type: Number, min: 1, max: 5 },
          communication:   { type: Number, min: 1, max: 5 },
        },
        { _id: false }
      ),
      default: null,
    },
    feedback: {
      type: String,
      required: [true, "Feedback is required"],
      trim: true,
      minlength: [10, "Feedback must be at least 10 characters"],
      maxlength: [500, "Feedback cannot exceed 500 characters"],
    },
    providerResponse: { type: String, maxlength: 500, default: null },
    providerRespondedAt: { type: Date, default: null },
    isHidden: { type: Boolean, default: false },
    hiddenReason: { type: String, default: null },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One review per client per job (replaces the old jobId-only unique index)
ReviewSchema.index({ jobId: 1, clientId: 1 }, { unique: true });
ReviewSchema.index({ clientId: 1 });
ReviewSchema.index({ providerId: 1, createdAt: -1 });

const Review: Model<ReviewDocument> =
  mongoose.models.Review ??
  mongoose.model<ReviewDocument>("Review", ReviewSchema);

export default Review;
