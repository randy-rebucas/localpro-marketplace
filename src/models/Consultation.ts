import { Schema, Document, Types, Model } from "mongoose";
import mongoose from "mongoose";

export interface IConsultationDocument extends Document {
  // Participants
  initiatorId: Types.ObjectId;
  targetUserId: Types.ObjectId;
  initiatorRole: "client" | "provider";

  // Content
  type: "site_inspection" | "chat";
  title: string;
  description: string;
  location: string;
  coordinates?: {
    type: "Point";
    coordinates: [number, number];
  };
  photos: string[];

  // Thread & Messages
  conversationThreadId: string;

  // Provider Response
  status: "pending" | "accepted" | "declined" | "converted" | "expired";
  estimateProvidedAt: Date | null;
  estimateProvidedBy: Types.ObjectId | null;
  estimateAmount: number | null;
  estimateNote: string | null;

  // Job Conversion
  jobCreatedFromConsultationId: Types.ObjectId | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export type ConsultationDocument = IConsultationDocument;

const consultationSchema = new Schema<ConsultationDocument>(
  {
    initiatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    initiatorRole: {
      type: String,
      enum: ["client", "provider"],
      required: true,
    },
    type: {
      type: String,
      enum: ["site_inspection", "chat"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
      minlength: 5,
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 1000,
    },
    location: {
      type: String,
      required: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    photos: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => arr.length >= 1 && arr.length <= 5,
        message: "Photos array must contain between 1 and 5 items",
      },
    },
    conversationThreadId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "converted", "expired"],
      default: "pending",
      index: true,
    },
    estimateProvidedAt: {
      type: Date,
      default: null,
    },
    estimateProvidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    estimateAmount: {
      type: Number,
      min: 1,
      default: null,
    },
    estimateNote: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string | null) {
          // Only validate minlength if field has a value
          if (!v) return true;
          return v.length >= 20;
        },
        message: "Estimate note must be at least 20 characters"
      }
    },
    jobCreatedFromConsultationId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
consultationSchema.index({ initiatorId: 1, status: 1, createdAt: -1 });
consultationSchema.index({ targetUserId: 1, status: 1, createdAt: -1 });

// Geospatial index for coordinates
consultationSchema.index({ "coordinates.coordinates": "2dsphere" });

// Always delete the cached model so hot-reloads pick up schema changes
// (no-op in production where the module is loaded once)
delete (mongoose.models as Record<string, unknown>).Consultation;

const Consultation: Model<ConsultationDocument> = mongoose.model<ConsultationDocument>(
  "Consultation",
  consultationSchema
);

export default Consultation;
