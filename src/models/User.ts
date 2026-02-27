import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser } from "@/types";

export interface UserDocument extends Omit<IUser, "_id">, Document {
  comparePassword(candidate: string): Promise<boolean>;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
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
      required: [true, "Password is required"],
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
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Indexes
UserSchema.index({ role: 1 });

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);

export default User;
