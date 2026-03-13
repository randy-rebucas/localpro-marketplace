import mongoose, { Schema, Document, Model } from "mongoose";

export type AgencyInviteRole = "worker" | "dispatcher" | "supervisor" | "finance";

export interface IAgencyInviteDoc {
  agencyId: mongoose.Types.ObjectId;
  agencyOwnerId: mongoose.Types.ObjectId;
  agencyName: string;
  invitedEmail: string;
  invitedUserId: mongoose.Types.ObjectId | null;
  role: AgencyInviteRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyInviteDocument extends IAgencyInviteDoc, Document {}

const AgencyInviteSchema = new Schema<AgencyInviteDocument>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "AgencyProfile",
      required: true,
      index: true,
    },
    agencyOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agencyName: { type: String, required: true, trim: true },
    invitedEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    invitedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    role: {
      type: String,
      enum: ["worker", "dispatcher", "supervisor", "finance"],
      default: "worker",
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate pending invites for the same email + agency
AgencyInviteSchema.index(
  { agencyId: 1, invitedEmail: 1 },
  { unique: true, partialFilterExpression: { acceptedAt: null } }
);

const AgencyInvite: Model<AgencyInviteDocument> =
  mongoose.models.AgencyInvite ??
  mongoose.model<AgencyInviteDocument>("AgencyInvite", AgencyInviteSchema);

export default AgencyInvite;
