import mongoose, { Schema, Document, Model } from "mongoose";

export type CronRunStatus = "running" | "completed" | "failed" | "skipped";

export interface ICronRun extends Document {
  /** The cron route path, e.g. "/api/cron/expire-jobs" */
  route:          string;
  status:         CronRunStatus;
  startedAt:      Date;
  finishedAt?:    Date;
  /** Duration in milliseconds */
  durationMs?:    number;
  /** Number of records/items processed (job-specific) */
  itemsProcessed: number;
  /** Error message if status === "failed" */
  error?:         string;
  /** Arbitrary metadata about the run (e.g. counts by type) */
  meta?:          Record<string, unknown>;
  createdAt:      Date;
  updatedAt:      Date;
}

const CronRunSchema = new Schema<ICronRun>(
  {
    route:          { type: String, required: true, index: true },
    status:         {
      type:    String,
      enum:    ["running", "completed", "failed", "skipped"] as CronRunStatus[],
      default: "running",
      index:   true,
    },
    startedAt:      { type: Date, required: true, default: Date.now },
    finishedAt:     { type: Date },
    durationMs:     { type: Number },
    itemsProcessed: { type: Number, default: 0 },
    error:          { type: String },
    meta:           { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Automatically compute duration when finishedAt is set
CronRunSchema.pre("save", function (next) {
  if (this.finishedAt && this.startedAt && !this.durationMs) {
    this.durationMs = this.finishedAt.getTime() - this.startedAt.getTime();
  }
  next();
});

// Keep only the last 90 days of cron run history
CronRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
CronRunSchema.index({ route: 1, startedAt: -1 });

const CronRun: Model<ICronRun> =
  mongoose.models["CronRun"] ??
  mongoose.model<ICronRun>("CronRun", CronRunSchema);

export default CronRun;
