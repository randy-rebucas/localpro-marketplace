import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser } from "@/types";

export interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export interface ExpoPushTokenRecord {
  token: string;           // Expo push token (format: ExponentPushToken[...])
  deviceId?: string;       // Unique device identifier
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserDocument extends Omit<IUser, "_id">, Document {
  comparePassword(candidate: string): Promise<boolean>;
  password?: string;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  otpCode?: string;
  otpExpiry?: Date;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  pushSubscriptions?: PushSubscriptionRecord[];
  expoPushTokens?: ExpoPushTokenRecord[];
  googleId?: string;
}

const AddressSubSchema = new Schema(
  {
    label:     { type: String, required: true, trim: true, maxlength: 50 },
    address:   { type: String, required: true, trim: true, maxlength: 500 },
    isDefault: { type: Boolean, default: false },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      _id: false,
    },
  },
  { _id: true }
);

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
      required: false,
      unique: true,
      sparse: true,
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
      enum: ["client", "provider", "admin", "staff", "peso"],
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
    accountType: {
      type: String,
      enum: ["personal", "business"],
      default: "personal",
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
    addresses: { type: [AddressSubSchema], default: [] },
    capabilities: { type: [String], default: [] },
    agencyId: { type: Schema.Types.ObjectId, ref: "AgencyProfile", default: null },
    facebookId: { type: String, default: null, index: true, sparse: true },
    googleId:   { type: String, default: null, index: true, sparse: true },
    oauthProvider: { type: String, enum: ["facebook", "google"], default: null },
    phone: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ["male", "female", "other", null], default: null },
    otpCode: { type: String, select: false, default: null },
    otpExpiry: { type: Date, select: false, default: null },
    verificationToken: { type: String, select: false },
    verificationTokenExpiry: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpiry: { type: Date, select: false },
    // PWA web-push subscriptions (one per device/browser)
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          expirationTime: { type: Number, default: null },
          keys: {
            p256dh: { type: String, required: true },
            auth:   { type: String, required: true },
            _id: false,
          },
          _id: false,
        },
      ],
      default: [],
      select: false,
    },
    // Expo push notification tokens (mobile apps)
    expoPushTokens: {
      type: [
        {
          token:      { type: String, required: true, trim: true },
          deviceId:   { type: String, default: null },
          createdAt:  { type: Date, default: Date.now },
          lastUsedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
      select: false,
    },
    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    // Fraud tracking
    flaggedJobCount: { type: Number, default: 0 },
    fraudFlags: { type: [String], default: [] },
    // Saved card for recurring auto-pay (card PMs only — not GCash/PayMaya)
    savedPaymentMethodId:   { type: String, default: null },
    savedPaymentMethodLast4: { type: String, default: null },
    savedPaymentMethodBrand: { type: String, default: null },
    // User-level preferences
    preferences: {
      type: new Schema({
        emailNotifications:   { type: Boolean, default: true },
        pushNotifications:    { type: Boolean, default: true },
        smsNotifications:     { type: Boolean, default: false },
        marketingEmails:      { type: Boolean, default: false },
        messageNotifications: { type: Boolean, default: true },
        profileVisible:       { type: Boolean, default: true },
        // Granular per-category email notification preferences
        emailCategories: {
          type: new Schema({
            jobUpdates:     { type: Boolean, default: true },
            quoteAlerts:    { type: Boolean, default: true },
            paymentAlerts:  { type: Boolean, default: true },
            disputeAlerts:  { type: Boolean, default: true },
            reminders:      { type: Boolean, default: true },
            messages:       { type: Boolean, default: true },
            consultations:  { type: Boolean, default: true },
            reviews:        { type: Boolean, default: true },
          }, { _id: false }),
          default: () => ({}),
        },
        // provider-only
        newJobAlerts:         { type: Boolean, default: true },
        quoteExpiryReminders: { type: Boolean, default: true },
        jobInviteAlerts:      { type: Boolean, default: true },
        reviewAlerts:         { type: Boolean, default: true },
        instantBooking:       { type: Boolean, default: false },
        autoReadReceipt:      { type: Boolean, default: false },
      }, { _id: false }),
      default: () => ({}),
    },
    // Account lockout after failed login attempts
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    // Activity tracking — stamped on every authenticated request (throttled).
    lastSeenAt: { type: Date, default: null, index: true },
    // Drip email idempotency — set when each wave is sent to prevent duplicates on cron retry.
    sentDripDay3At: { type: Date, default: null },
    sentDripDay7At: { type: Date, default: null },
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
UserSchema.index({ approvalStatus: 1 });
// Unique sparse index — phone numbers must be distinct (null is excluded)
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
// NOTE: DO NOT use TTL indexes on token expiry fields — they delete entire documents!
// Token fields are manually cleared by setVerificationToken(), setResetPasswordToken(), etc.
// For expired/orphaned tokens, the retention-cleanup cron handles anonymization at 90 days.

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);

export default User;
