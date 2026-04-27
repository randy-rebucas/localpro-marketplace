import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Blog Comment Model
 * 
 * Stores comments on blog articles with support for:
 * - Nested replies
 * - Moderation status
 * - Author information (both registered users and guests)
 */

export interface IBlogComment {
  blog: Types.ObjectId;
  author?: Types.ObjectId; // Registered user (optional)
  authorName: string; // For guests or override
  authorEmail: string; // For guest notifications
  content: string;
  status: "pending" | "approved" | "rejected" | "spam";
  parentComment?: Types.ObjectId; // For nested replies
  isDeleted: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BlogCommentDocument = IBlogComment & Document;

const BlogCommentSchema = new Schema<BlogCommentDocument>(
  {
    blog: {
      type: Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    authorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "spam"],
      default: "pending",
      index: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "BlogComment",
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "blog_comments",
  }
);

// Index for efficient queries
BlogCommentSchema.index({ blog: 1, status: 1, createdAt: -1 });
BlogCommentSchema.index({ blog: 1, parentComment: 1, status: 1 });

export default mongoose.models.BlogComment ||
  mongoose.model<BlogCommentDocument>("BlogComment", BlogCommentSchema);
