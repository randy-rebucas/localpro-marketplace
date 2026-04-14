import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGeoCheckIn {
  _id?: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy: number; // GPS accuracy radius in meters
  distanceToJobLocation: number; // calculated distance in meters
  isValidCheckIn: boolean; // within 100m geofence
  checkInStatus: "on_time" | "late" | "no_show"; // relative to scheduled time
  attemptNumber: number; // 1st, 2nd, 3rd+ check-in attempt
  deviceInfo?: {
    platform: "ios" | "android" | "web";
    appVersion: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoCheckInDocument extends Omit<IGeoCheckIn, "_id">, Document {}

const GeoCheckInSchema = new Schema<GeoCheckInDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      default: 10, // typical GPS accuracy in meters
    },
    distanceToJobLocation: {
      type: Number,
      required: true,
      min: 0, // distance in meters
    },
    isValidCheckIn: {
      type: Boolean,
      required: true,
      default: false, // true if within 100m geofence
    },
    checkInStatus: {
      type: String,
      enum: ["on_time", "late", "no_show"],
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    deviceInfo: {
      platform: {
        type: String,
        enum: ["ios", "android", "web"],
        default: "ios",
      },
      appVersion: {
        type: String,
        required: false,
      },
      timestamp: {
        type: Date,
        required: false,
      },
      _id: false,
    },
  },
  { timestamps: true }
);

// Index for finding check-ins by job and provider
GeoCheckInSchema.index({ jobId: 1, providerId: 1 });
// Index for finding recent check-ins
GeoCheckInSchema.index({ createdAt: -1 });
// Index for finding no-show patterns by provider
GeoCheckInSchema.index({ providerId: 1, checkInStatus: 1, createdAt: -1 });

export const GeoCheckIn: Model<GeoCheckInDocument> = mongoose.models
  .GeoCheckIn || mongoose.model<GeoCheckInDocument>("GeoCheckIn", GeoCheckInSchema);

export default GeoCheckIn;
