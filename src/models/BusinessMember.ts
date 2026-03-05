import mongoose, { Schema, Document, Model } from "mongoose";
import type { IBusinessMember } from "@/types";

export interface BusinessMemberDocument
  extends Omit<IBusinessMember, "_id">,
    Document {}

const BusinessMemberSchema = new Schema<BusinessMemberDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "BusinessOrganization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "manager", "supervisor", "finance"],
      required: true,
    },
    // Subset of org locationIds this member can manage (empty = all locations)
    locationAccess: { type: [Schema.Types.ObjectId], default: [] },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// One record per user per org
BusinessMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

const BusinessMember: Model<BusinessMemberDocument> =
  mongoose.models.BusinessMember ??
  mongoose.model<BusinessMemberDocument>("BusinessMember", BusinessMemberSchema);

export default BusinessMember;
