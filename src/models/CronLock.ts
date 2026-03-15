/**
 * CronLock — lightweight distributed mutex for serverless cron jobs.
 *
 * Each cron task is identified by a unique `name`. Before processing,
 * the task attempts to atomically acquire the lock via `findOneAndUpdate`
 * with a conditional filter requiring the lock is either unclaimed or expired.
 * This ensures only one instance proceeds even when multiple serverless
 * invocations run concurrently (e.g., Vercel edge replicas).
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICronLock {
  name: string;
  lockedAt: Date;
  lockedBy: string;
}

export interface CronLockDocument extends Omit<ICronLock, "_id">, Document {}

const CronLockSchema = new Schema<CronLockDocument>(
  {
    name:      { type: String, required: true, unique: true },
    lockedAt:  { type: Date,   required: true },
    lockedBy:  { type: String, required: true },
  },
  { timestamps: false }
);

// name already has unique: true on the field — no separate index needed

const CronLock: Model<CronLockDocument> =
  mongoose.models.CronLock ??
  mongoose.model<CronLockDocument>("CronLock", CronLockSchema);

export default CronLock;
