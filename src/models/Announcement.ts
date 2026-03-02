import mongoose, { Schema, Document, Model } from "mongoose";
import type { IAnnouncement } from "@/types";

export interface AnnouncementDocument extends Omit<IAnnouncement, "_id">, Document {}

const AnnouncementSchema = new Schema<AnnouncementDocument>(
  {
    title:       { type: String, required: true, trim: true },
    message:     { type: String, required: true, trim: true },
    type:        { type: String, enum: ["info", "warning", "success", "danger"], default: "info" },
    targetRoles: { type: [String], default: ["all"] },
    isActive:    { type: Boolean, default: true, index: true },
    expiresAt:   { type: Date, default: null },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ isActive: 1, targetRoles: 1, expiresAt: 1 });

const Announcement: Model<AnnouncementDocument> =
  mongoose.models.Announcement ??
  mongoose.model<AnnouncementDocument>("Announcement", AnnouncementSchema);

export default Announcement;
