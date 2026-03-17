import mongoose, { Schema, Document, Model } from "mongoose";
import type { ITrainingEnrollment } from "@/types";

export interface TrainingEnrollmentDocument extends Omit<ITrainingEnrollment, "_id">, Document {}

const TrainingEnrollmentSchema = new Schema<TrainingEnrollmentDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "TrainingCourse",
      required: true,
      index: true,
    },
    courseTitle:   { type: String, required: true, trim: true },
    amountPaid:    { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["enrolled", "completed", "refunded"],
      default: "enrolled",
    },
    /** Array of lesson _ids from the course that the provider has completed */
    completedLessons: { type: [Schema.Types.ObjectId], default: [] },
    completedAt:      { type: Date, default: null },
    badgeGranted:     { type: Boolean, default: false },
    walletTxId:           { type: String, default: null },
    paymongoSessionId:    { type: String, default: null },
    ledgerJournalId:      { type: String, default: null },
  },
  { timestamps: true }
);

// One enrollment per course per provider
TrainingEnrollmentSchema.index({ providerId: 1, courseId: 1 }, { unique: true });
TrainingEnrollmentSchema.index({ status: 1, createdAt: -1 });

const TrainingEnrollment: Model<TrainingEnrollmentDocument> =
  (mongoose.models.TrainingEnrollment as Model<TrainingEnrollmentDocument>) ??
  mongoose.model<TrainingEnrollmentDocument>("TrainingEnrollment", TrainingEnrollmentSchema);

export default TrainingEnrollment;
