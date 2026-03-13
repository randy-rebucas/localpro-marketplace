import mongoose, { Schema, Document, Model } from "mongoose";

export type AgencyStaffPayoutStatus = "pending" | "paid";

export interface IAgencyStaffPayoutDoc {
  agencyId: mongoose.Types.ObjectId;
  agencyOwnerId: mongoose.Types.ObjectId;
  workerId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  /** Total amount released from escrow (net of platform commission) */
  grossAmount: number;
  /** Worker's cut (grossAmount × workerSharePct / 100) */
  workerAmount: number;
  /** Agency's margin (grossAmount − workerAmount) */
  agencyAmount: number;
  /** Worker share percentage applied, e.g. 60 */
  workerSharePct: number;
  status: AgencyStaffPayoutStatus;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyStaffPayoutDocument
  extends IAgencyStaffPayoutDoc,
    Document {}

const AgencyStaffPayoutSchema = new Schema<AgencyStaffPayoutDocument>(
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
      index: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true, // one payout record per job
      index: true,
    },
    grossAmount:    { type: Number, required: true, min: 0 },
    workerAmount:   { type: Number, required: true, min: 0 },
    agencyAmount:   { type: Number, required: true, min: 0 },
    workerSharePct: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AgencyStaffPayoutSchema.index({ agencyOwnerId: 1, status: 1, createdAt: -1 });
AgencyStaffPayoutSchema.index({ workerId: 1, status: 1, createdAt: -1 });

const AgencyStaffPayout: Model<AgencyStaffPayoutDocument> =
  mongoose.models.AgencyStaffPayout ??
  mongoose.model<AgencyStaffPayoutDocument>(
    "AgencyStaffPayout",
    AgencyStaffPayoutSchema
  );

export default AgencyStaffPayout;
