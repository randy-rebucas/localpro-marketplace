import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId;
  channel: "email" | "push" | "in_app";
  category: "job_updates" | "messages" | "payments" | "reviews" | "marketing" | "system";
  enabled: boolean;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: {
      type: String,
      enum: ["email", "push", "in_app"],
      required: true,
    },
    category: {
      type: String,
      enum: ["job_updates", "messages", "payments", "reviews", "marketing", "system"],
      required: true,
    },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NotificationPreferenceSchema.index(
  { userId: 1, channel: 1, category: 1 },
  { unique: true }
);

const NotificationPreference: Model<INotificationPreference> =
  mongoose.models.NotificationPreference ??
  mongoose.model<INotificationPreference>("NotificationPreference", NotificationPreferenceSchema);

export default NotificationPreference;
