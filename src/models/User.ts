import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser } from "@/types";

export interface UserDocument extends Omit<IUser, "_id">, Document {
  comparePassword(candidate: string): Promise<boolean>;
  password?: string;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  otpCode?: string;
  otpExpiry?: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: false,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["client", "provider", "admin"],
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ["pending_approval", "approved", "rejected"],
      default: "approved",
    },
    avatar: { type: String, default: null },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    kycDocuments: [
      {
        type:       { type: String, required: true },
        url:        { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    kycRejectionReason: { type: String, default: null },
    facebookId: { type: String, default: null, index: true, sparse: true },
    oauthProvider: { type: String, enum: ["facebook", null], default: null },
    phone: { type: String, default: null, sparse: true },
    otpCode: { type: String, select: false, default: null },
    otpExpiry: { type: Date, select: false, default: null },
    verificationToken: { type: String, select: false },
    verificationTokenExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpiry: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret: Record<string, unknown>) {
        ret.password = undefined;
        ret.__v = undefined;
      },
    },
  }
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  const doc = this as unknown as UserDocument;
  if (!doc.isModified("password") || !doc.password) return next();
  const salt = await bcrypt.genSalt(12);
  doc.password = await bcrypt.hash(doc.password, salt);
  next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  const doc = this as unknown as UserDocument;
  return bcrypt.compare(candidate, doc.password ?? "");
};

// Indexes
UserSchema.index({ role: 1 });

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);

export default User;
