import mongoose, { Schema, Document, Model } from "mongoose";
import type { IJob } from "@/types";

export interface JobDocument extends Omit<IJob, "_id">, Document {}

const JobSchema = new Schema<JobDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [1, "Budget must be at least ₱1"],
    },
    status: {
      type: String,
      enum: [
        "pending_validation",
        "open",
        "assigned",
        "in_progress",
        "completed",
        "disputed",
        "rejected",
        "refunded",
        "expired",
      ],
      default: "pending_validation",
    },
    escrowStatus: {
      type: String,
      enum: ["not_funded", "funded", "released", "refunded"],
      default: "not_funded",
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    scheduleDate: {
      type: Date,
      required: [true, "Schedule date is required"],
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    beforePhoto: { type: [String], default: [] },
    afterPhoto: { type: [String], default: [] },
    coordinates: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes for common queries
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ clientId: 1, status: 1 });
JobSchema.index({ providerId: 1, status: 1 });
JobSchema.index({ category: 1, status: 1 });
JobSchema.index({ coordinates: "2dsphere" }, { sparse: true });

// Always delete the cached model so hot-reloads pick up schema changes
// (no-op in production where the module is loaded once)
delete (mongoose.models as Record<string, unknown>).Job;

const Job: Model<JobDocument> = mongoose.model<JobDocument>("Job", JobSchema);

export default Job;
