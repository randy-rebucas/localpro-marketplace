import mongoose, { Schema, Document, Model } from "mongoose";
import type { IProviderProfile, DayOfWeek } from "@/types";
import { DEFAULT_SCHEDULE } from "@/types";

export interface ProviderProfileDocument
  extends Omit<IProviderProfile, "_id">,
    Document {}

const PortfolioItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
  },
  { _id: false }
);

const ProviderProfileSchema = new Schema<ProviderProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    bio: { type: String, default: "", trim: true, maxlength: 1000 },
    skills: [{ type: String, trim: true }],
    yearsExperience: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: null, min: 0 },
    portfolioItems: [PortfolioItemSchema],
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "unavailable"],
      default: "available",
    },
    schedule: {
      type: Map,
      of: new Schema(
        {
          enabled: { type: Boolean, required: true },
          from:    { type: String, required: true },
          to:      { type: String, required: true },
        },
        { _id: false }
      ),
      default: () =>
        Object.fromEntries(
          (Object.keys(DEFAULT_SCHEDULE) as DayOfWeek[]).map((d) => [
            d,
            DEFAULT_SCHEDULE[d],
          ])
        ),
    },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    completedJobCount: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseTimeHours: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const ProviderProfile: Model<ProviderProfileDocument> =
  mongoose.models.ProviderProfile ??
  mongoose.model<ProviderProfileDocument>(
    "ProviderProfile",
    ProviderProfileSchema
  );

export default ProviderProfile;
