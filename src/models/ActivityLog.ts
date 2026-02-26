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
        "job_completed",
        "escrow_released",
        "dispute_opened",
        "dispute_resolved",
        "review_submitted",
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

const ActivityLog: Model<ActivityLogDocument> =
  mongoose.models.ActivityLog ??
  mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
