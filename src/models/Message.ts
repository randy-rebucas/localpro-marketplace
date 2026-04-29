import mongoose, { Schema, Document, Model } from "mongoose";
import type { IMessage } from "@/types";

export interface MessageDocument extends Omit<IMessage, "_id">, Document {}

const MessageSchema = new Schema<MessageDocument>(
  {
    threadId:   { type: String, required: true, index: true },
    senderId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body:       { type: String, required: true, trim: true, maxlength: 2000 },
    type:       { type: String, enum: ["text", "file", "system"], default: "text" },
    fileUrl:    { type: String, default: null },
    fileName:   { type: String, default: null },
    fileMime:   { type: String, default: null },
    fileSize:   { type: Number, default: null },
    readAt:     { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ readAt: 1 }, { sparse: true });
MessageSchema.index({ receiverId: 1, readAt: 1, createdAt: -1 });

const Message: Model<MessageDocument> =
  mongoose.models.Message ?? mongoose.model<MessageDocument>("Message", MessageSchema);

export default Message;
