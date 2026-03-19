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
      required: false,
      min: [0, "Budget cannot be negative"],
      default: 0,
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
        "cancelled",
      ],
      default: "pending_validation",
    },
    escrowStatus: {
      type: String,
      enum: ["not_funded", "funded", "released", "refunded"],
      default: "not_funded",
    },
    partialReleaseAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    scheduleDate: {
      type: Date,
      required: false,
      default: null,
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
    fraudFlags: {
      type: [String],
      default: [],
    },
    beforePhoto: { type: [String], default: [] },
    afterPhoto: { type: [String], default: [] },
    coordinates: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    invitedProviderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    milestones: {
      type: [
        new Schema(
          {
            title:       { type: String, required: true, trim: true, maxlength: 100 },
            amount:      { type: Number, required: true, min: 1 },
            description: { type: String, trim: true, default: "" },
            status:      { type: String, enum: ["pending", "released"], default: "pending" },
            releasedAt:  { type: Date, default: null },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    /** Set when this job was auto-spawned from a recurring schedule */
    recurringScheduleId: {
      type: Schema.Types.ObjectId,
      ref: "RecurringSchedule",
      default: null,
    },
    // ── PESO fields ──────────────────────────────────────────────
    jobSource: {
      type: String,
      enum: ["private", "peso", "lgu"],
      default: "private",
    },
    jobTags: {
      type: [String],
      enum: ["peso", "lgu_project", "gov_program", "emergency", "internship"],
      default: [],
    },
    pesoPostedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isPriority: { type: Boolean, default: false },
    /** Urgency level selected by the client at job creation */
    urgency: {
      type: String,
      enum: ["standard", "same_day", "rush"],
      default: "standard",
    },
    /** Flat urgent booking fee locked in at job creation from AppSettings (PHP) */
    urgencyFee: { type: Number, default: 0 },
    /** Cancellation fee charged when the client cancels an assigned job (PHP). Populated at cancellation time. */
    cancellationFee: { type: Number, default: 0 },
    /** Escrow service fee (2%) snapshot locked in at escrow funding (PHP) */
    escrowFee: { type: Number, default: 0 },
    /** Payment processing fee (2%) snapshot locked in at escrow funding (PHP) */
    processingFee: { type: Number, default: 0 },
    /** Client-side platform service fee (5%) snapshot locked in at escrow funding (PHP) */
    platformServiceFee: { type: Number, default: 0 },
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
// PESO-specific indexes
JobSchema.index({ jobSource: 1, status: 1 });
JobSchema.index({ pesoPostedBy: 1, status: 1 }, { sparse: true });
JobSchema.index({ isPriority: -1, status: 1, createdAt: -1 });
JobSchema.index({ escrowStatus: 1 });
JobSchema.index({ invitedProviderId: 1 }, { sparse: true });
JobSchema.index({ scheduleDate: 1 });
JobSchema.index({ status: 1, escrowStatus: 1 });

// Always delete the cached model so hot-reloads pick up schema changes
// (no-op in production where the module is loaded once)
delete (mongoose.models as Record<string, unknown>).Job;

const Job: Model<JobDocument> = mongoose.model<JobDocument>("Job", JobSchema);

export default Job;
