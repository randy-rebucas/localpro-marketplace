import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILivelihoodGroup {
  _id: string;
  name: string;
  type: string;
  barangay: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  memberCount: number;
  status: "active" | "inactive";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface LivelihoodGroupDocument extends Omit<ILivelihoodGroup, "_id">, Document {}

const LivelihoodGroupSchema = new Schema<LivelihoodGroupDocument>(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    type: {
      type: String,
      required: [true, "Group type is required"],
      trim: true,
    },
    barangay: {
      type: String,
      required: [true, "Barangay is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    memberCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

LivelihoodGroupSchema.index({ createdBy: 1, status: 1 });

delete (mongoose.models as Record<string, unknown>).LivelihoodGroup;

const LivelihoodGroup: Model<LivelihoodGroupDocument> = mongoose.model<LivelihoodGroupDocument>(
  "LivelihoodGroup",
  LivelihoodGroupSchema
);

export default LivelihoodGroup;
