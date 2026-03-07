import mongoose, { Schema, Document, Model } from "mongoose";
import type { IQuoteTemplate } from "@/types";

export interface QuoteTemplateDocument extends Omit<IQuoteTemplate, "_id">, Document {}

const MilestoneSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuoteTemplateSchema = new Schema<QuoteTemplateDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    laborCost: { type: Number, min: 0, default: null },
    materialsCost: { type: Number, min: 0, default: null },
    timeline: { type: String, trim: true, default: "" },
    milestones: { type: [MilestoneSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: null },
  },
  { timestamps: true }
);

const QuoteTemplate: Model<QuoteTemplateDocument> =
  mongoose.models.QuoteTemplate ??
  mongoose.model<QuoteTemplateDocument>("QuoteTemplate", QuoteTemplateSchema);

export default QuoteTemplate;
