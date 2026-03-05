import mongoose, { Schema, Document, Model } from "mongoose";
import type { IBusinessOrganization } from "@/types";

export interface BusinessOrganizationDocument
  extends Omit<IBusinessOrganization, "_id">,
    Document {}

const LocationSubSchema = new Schema(
  {
    label:   { type: String, required: true, trim: true, maxlength: 100 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      _id: false,
    },
    monthlyBudget: { type: Number, default: 0, min: 0 },
    isActive:      { type: Boolean, default: true },
    alertThreshold: { type: Number, default: 80, min: 0, max: 100 },
    preferredProviderIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    allowedCategories: { type: [String], default: [] },
  },
  { _id: true }
);

const BusinessOrganizationSchema = new Schema<BusinessOrganizationDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["hotel", "company", "other"],
      default: "company",
    },
    logo: { type: String, default: null },
    locations: { type: [LocationSubSchema], default: [] },
    defaultMonthlyBudget: { type: Number, default: 0, min: 0 },
    plan:                 { type: String, enum: ["starter", "growth", "pro", "enterprise"], default: "starter" },
    planStatus:           { type: String, enum: ["active", "past_due", "cancelled"], default: "active" },
    planActivatedAt:      { type: Date, default: null },
    planExpiresAt:        { type: Date, default: null },
    pendingPlanSessionId: { type: String, default: null },
    pendingPlan:          { type: String, enum: ["starter", "growth", "pro", "enterprise", null], default: null },
  },
  { timestamps: true }
);

BusinessOrganizationSchema.index({ ownerId: 1 });

const BusinessOrganization: Model<BusinessOrganizationDocument> =
  mongoose.models.BusinessOrganization ??
  mongoose.model<BusinessOrganizationDocument>(
    "BusinessOrganization",
    BusinessOrganizationSchema
  );

export default BusinessOrganization;
