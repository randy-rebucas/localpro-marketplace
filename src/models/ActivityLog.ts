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
        // Job lifecycle
        "job_created", "job_approved", "job_rejected", "job_started",
        "job_completed", "job_expired", "job_cancelled", "job_reopened",
        // Quotes
        "quote_submitted", "quote_accepted", "quote_expired", "quote_revised",
        // Escrow / Payments
        "escrow_funded", "escrow_released", "provider_withdrew",
        "payout_requested", "payout_updated",
        // Disputes
        "dispute_opened", "dispute_resolved",
        // Reviews
        "review_submitted", "review_responded", "review_hidden", "review_unhidden",
        // Consultations
        "consultation_requested", "consultation_accepted", "consultation_declined",
        "consultation_converted_to_job", "consultation_stale_accepted",
        // Recurring
        "recurring_created", "recurring_cancelled", "recurring_job_spawned",
        // User / Auth
        "user_registered", "user_login", "user_login_failed", "email_verified",
        "user_deleted", "user_deletion_requested", "user_data_exported",
        "user_password_reset", "user_unlocked",
        // Admin actions
        "admin_ledger_entry", "admin_impersonation",
        "account_suspended", "account_unsuspended",
        "provider_approved", "provider_rejected", "role_changed",
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
    ipAddress: {
      type: String,
      default: null,
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
