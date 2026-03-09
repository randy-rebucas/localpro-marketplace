import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJobApplication {
  _id: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  coverLetter: string;
  availability: string;
  status: "pending" | "shortlisted" | "rejected" | "hired";
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplicationDocument extends Omit<IJobApplication, "_id">, Document {}

const JobApplicationSchema = new Schema<JobApplicationDocument>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
      minlength: [20, "Cover letter must be at least 20 characters"],
      maxlength: [2000, "Cover letter cannot exceed 2000 characters"],
    },
    availability: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Availability cannot exceed 200 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected", "hired"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// One application per applicant per job
JobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

const JobApplication: Model<JobApplicationDocument> =
  mongoose.models.JobApplication ??
  mongoose.model<JobApplicationDocument>("JobApplication", JobApplicationSchema);

export default JobApplication;
