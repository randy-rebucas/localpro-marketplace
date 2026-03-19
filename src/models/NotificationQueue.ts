import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationQueue extends Document {
  userId: mongoose.Types.ObjectId;
  channel: "email" | "push";
  category: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  sentAt: Date | null;
  batchId: string | null;
}

const NotificationQueueSchema = new Schema<INotificationQueue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: {
      type: String,
      enum: ["email", "push"],
      required: true,
    },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    batchId: { type: String, default: null },
  },
  { timestamps: true }
);

NotificationQueueSchema.index({ sentAt: 1, scheduledFor: 1 });
NotificationQueueSchema.index({ userId: 1, channel: 1, sentAt: 1 });

const NotificationQueue: Model<INotificationQueue> =
  mongoose.models.NotificationQueue ??
  mongoose.model<INotificationQueue>("NotificationQueue", NotificationQueueSchema);

export default NotificationQueue;
