import mongoose, { Schema, Document, Model } from "mongoose";
import type { IPesoOffice } from "@/types";

export interface PesoOfficeDocument extends Omit<IPesoOffice, "_id">, Document {}

const PesoOfficeSchema = new Schema<PesoOfficeDocument>(
  {
    officeName: {
      type: String,
      required: [true, "Office name is required"],
      trim: true,
      maxlength: 200,
    },
    municipality: {
      type: String,
      required: [true, "Municipality is required"],
      trim: true,
      maxlength: 100,
    },
    region: {
      type: String,
      required: [true, "Region is required"],
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      lowercase: true,
      trim: true,
    },
    headOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    officerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PesoOfficeSchema.index({ municipality: 1 });
PesoOfficeSchema.index({ headOfficerId: 1 });

const PesoOffice: Model<PesoOfficeDocument> =
  mongoose.models.PesoOffice ??
  mongoose.model<PesoOfficeDocument>("PesoOffice", PesoOfficeSchema);

export default PesoOffice;
