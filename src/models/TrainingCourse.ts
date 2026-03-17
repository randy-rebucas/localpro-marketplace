import mongoose, { Schema, Document, Model } from "mongoose";
import type { ITrainingCourse } from "@/types";

export interface TrainingCourseDocument extends Omit<ITrainingCourse, "_id">, Document {}

const LessonSchema = new Schema(
  {
    title:           { type: String, required: true, trim: true, maxlength: 150 },
    content:         { type: String, required: true },          // Markdown
    durationMinutes: { type: Number, default: 0, min: 0 },
    order:           { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const TrainingCourseSchema = new Schema<TrainingCourseDocument>(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    slug:        { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ["basic", "advanced", "safety", "custom", "certification"],
      default: "basic",
    },
    price:           { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    badgeSlug:       { type: String, required: true, trim: true, unique: true },
    isPublished:     { type: Boolean, default: false },
    lessons:         { type: [LessonSchema], default: [] },
    enrollmentCount: { type: Number, default: 0, min: 0 },
    createdBy:       { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TrainingCourseSchema.index({ isPublished: 1, category: 1 });
// slug already has unique: true on the field — no separate index needed

const TrainingCourse: Model<TrainingCourseDocument> =
  (mongoose.models.TrainingCourse as Model<TrainingCourseDocument>) ??
  mongoose.model<TrainingCourseDocument>("TrainingCourse", TrainingCourseSchema);

export default TrainingCourse;
