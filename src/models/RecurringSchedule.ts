import mongoose, { Schema, Document, Model } from "mongoose";
import type { IRecurringSchedule } from "@/types";

export interface RecurringScheduleDocument
  extends Omit<IRecurringSchedule, "_id">,
    Document {}

const RecurringScheduleSchema = new Schema<RecurringScheduleDocument>(
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
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
    },
    autoPayEnabled: {
      type: Boolean,
      default: false,
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    nextRunAt: {
      type: Date,
      required: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    totalRuns: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRuns: {
      type: Number,
      default: null,
      min: 1,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

RecurringScheduleSchema.index({ status: 1, nextRunAt: 1 });
RecurringScheduleSchema.index({ clientId: 1, status: 1 });

delete (mongoose.models as Record<string, unknown>).RecurringSchedule;

const RecurringSchedule: Model<RecurringScheduleDocument> =
  mongoose.model<RecurringScheduleDocument>(
    "RecurringSchedule",
    RecurringScheduleSchema
  );

export default RecurringSchedule;
