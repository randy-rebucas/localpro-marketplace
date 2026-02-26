import mongoose, { Schema, Document, Model } from "mongoose";
import type { IReview } from "@/types";

export interface ReviewDocument extends Omit<IReview, "_id">, Document {}

const ReviewSchema = new Schema<ReviewDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true, // one review per job
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
    feedback: {
      type: String,
      required: [true, "Feedback is required"],
      trim: true,
      minlength: [10, "Feedback must be at least 10 characters"],
      maxlength: [500, "Feedback cannot exceed 500 characters"],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Review: Model<ReviewDocument> =
  mongoose.models.Review ??
  mongoose.model<ReviewDocument>("Review", ReviewSchema);

export default Review;
