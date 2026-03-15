import mongoose, { Schema, Document, Model } from "mongoose";

export type BackupType = "atlas_snapshot" | "json_export";
export type BackupStatus = "pending" | "completed" | "failed";
export type BackupTrigger = "cron" | "admin";

export interface IBackupLog {
  _id: string;
  type: BackupType;
  status: BackupStatus;
  triggeredBy: BackupTrigger;
  adminId?: string;
  snapshotId?: string;
  description?: string;
  error?: string;
  sizeBytes?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface BackupLogDocument extends Omit<IBackupLog, "_id">, Document {}

const BackupLogSchema = new Schema<BackupLogDocument>(
  {
    type: {
      type: String,
      enum: ["atlas_snapshot", "json_export"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    triggeredBy: {
      type: String,
      enum: ["cron", "admin"],
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    snapshotId: { type: String },
    description: { type: String },
    error: { type: String },
    sizeBytes: { type: Number },
    completedAt: { type: Date },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// TTL: auto-delete logs older than 180 days
BackupLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const BackupLog: Model<BackupLogDocument> =
  mongoose.models.BackupLog ??
  mongoose.model<BackupLogDocument>("BackupLog", BackupLogSchema);

export default BackupLog;
