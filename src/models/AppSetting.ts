/**
 * AppSetting — key/value store for admin-controlled feature flags and
 * application configuration.
 *
 * Each document holds one setting.  The `key` field is unique.
 * Value is stored as a generic Mixed so booleans, strings, and numbers
 * are all supported.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAppSetting {
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string; // userId
}

export interface AppSettingDocument extends Omit<IAppSetting, "_id">, Document {}

const AppSettingSchema = new Schema<AppSettingDocument>(
  {
    key:         { type: String, required: true, unique: true, trim: true, index: true },
    value:       { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy:   { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const AppSetting: Model<AppSettingDocument> =
  mongoose.models.AppSetting ??
  mongoose.model<AppSettingDocument>("AppSetting", AppSettingSchema);

export default AppSetting;
