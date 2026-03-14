import mongoose, { Schema, Document, Model } from "mongoose";
import type { IActivityLog, ActivityEventType } from "@/types";

export interface ActivityLogDocument
  extends Omit<IActivityLog, "_id">,
    Document {}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "job_created",
        "job_approved",
        "job_rejected",
        "quote_submitted",
        "quote_accepted",
        "escrow_funded",
        "job_started",
        "job_completed",
        "escrow_released",
        "dispute_opened",
        "dispute_resolved",
        "review_submitted",
        "job_expired",
        "quote_expired",
        "payout_requested",
        "payout_updated",
        "consultation_requested",
        "consultation_accepted",
        "consultation_declined",
        "consultation_converted_to_job",
        "consultation_stale_accepted",
        "recurring_created",
        "recurring_cancelled",
        "recurring_job_spawned",
        "job_cancelled",
        "provider_withdrew",
        "admin_ledger_entry",
      ] as ActivityEventType[],
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ jobId: 1 });

// Use the cached model when available to avoid OverwriteModelError across
// hot-reloads in development and during tests.
const ActivityLog: Model<ActivityLogDocument> =
  (mongoose.models.ActivityLog as Model<ActivityLogDocument>) ??
  mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
