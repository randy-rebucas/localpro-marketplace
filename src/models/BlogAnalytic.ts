import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Blog Analytics Model
 * 
 * Tracks engagement metrics for blog articles:
 * - Page views
 * - Read time
 * - Scroll depth
 * - User engagement
 */

export interface IBlogAnalytic {
  blog: Types.ObjectId;
  sessionId: string; // Anonymous session tracking
  userId?: Types.ObjectId; // Optional: if user is logged in
  viewCount: number;
  avgReadTime: number; // in seconds
  avgScrollDepth: number; // 0-100 percentage
  returnVisits: number;
  referrer?: string;
  userAgent?: string;
  country?: string;
  lastViewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BlogAnalyticDocument = IBlogAnalytic & Document;

const BlogAnalyticSchema = new Schema<BlogAnalyticDocument>(
  {
    blog: {
      type: Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    viewCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    avgReadTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgScrollDepth: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    returnVisits: {
      type: Number,
      default: 0,
      min: 0,
    },
    referrer: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    country: {
      type: String,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "blog_analytics",
  }
);

// Indexes for efficient queries
BlogAnalyticSchema.index({ blog: 1, createdAt: -1 });
BlogAnalyticSchema.index({ sessionId: 1, blog: 1 });
BlogAnalyticSchema.index({ lastViewedAt: -1 });

export default mongoose.models.BlogAnalytic ||
  mongoose.model<BlogAnalyticDocument>("BlogAnalytic", BlogAnalyticSchema);
