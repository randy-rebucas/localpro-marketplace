import BlogComment, { type BlogCommentDocument } from "@/models/BlogComment";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";

/**
 * Blog Comment Repository
 *
 * Data access layer for blog comment operations
 */
export class BlogCommentRepository {
  private async connect(): Promise<void> {
    await connectDB();
  }

  /**
   * Get approved comments for a blog article (threaded view)
   */
  async getApprovedComments(
    blogId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    comments: BlogCommentDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.connect();
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      BlogComment.find({
        blog: new Types.ObjectId(blogId),
        status: "approved",
        isDeleted: false,
        parentComment: null, // Top-level comments only
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email")
        .lean(),
      BlogComment.countDocuments({
        blog: new Types.ObjectId(blogId),
        status: "approved",
        isDeleted: false,
        parentComment: null,
      }),
    ]);

    return {
      comments: comments as unknown as BlogCommentDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get replies to a comment
   */
  async getReplies(
    parentCommentId: string
  ): Promise<BlogCommentDocument[]> {
    await this.connect();
    const replies = await BlogComment.find({
      parentComment: new Types.ObjectId(parentCommentId),
      status: "approved",
      isDeleted: false,
    })
      .sort({ createdAt: 1 })
      .populate("author", "name email")
      .lean();

    return replies as unknown as BlogCommentDocument[];
  }

  /**
   * Create new comment
   */
  async create(data: {
    blog: string;
    author?: string;
    authorName: string;
    authorEmail: string;
    content: string;
    parentComment?: string;
  }): Promise<BlogCommentDocument> {
    await this.connect();
    const comment = new BlogComment({
      blog: new Types.ObjectId(data.blog),
      ...(data.author && { author: new Types.ObjectId(data.author) }),
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      content: data.content,
      ...(data.parentComment && {
        parentComment: new Types.ObjectId(data.parentComment),
      }),
      status: "pending", // Comments require moderation by default
    });

    await comment.save();
    return comment.toObject() as BlogCommentDocument;
  }

  /**
   * Get all comments for moderation (admin view)
   */
  async getPendingComments(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    comments: BlogCommentDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.connect();
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      BlogComment.find({
        status: "pending",
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("blog", "title slug")
        .populate("author", "name email")
        .lean(),
      BlogComment.countDocuments({
        status: "pending",
        isDeleted: false,
      }),
    ]);

    return {
      comments: comments as unknown as BlogCommentDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Approve comment
   */
  async approve(commentId: string): Promise<BlogCommentDocument | null> {
    await this.connect();
    return BlogComment.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      { status: "approved" },
      { new: true }
    );
  }

  /**
   * Reject comment
   */
  async reject(commentId: string): Promise<BlogCommentDocument | null> {
    await this.connect();
    return BlogComment.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      { status: "rejected" },
      { new: true }
    );
  }

  /**
   * Mark as spam
   */
  async markAsSpam(commentId: string): Promise<BlogCommentDocument | null> {
    await this.connect();
    return BlogComment.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      { status: "spam" },
      { new: true }
    );
  }

  /**
   * Delete comment (soft delete)
   */
  async delete(commentId: string): Promise<BlogCommentDocument | null> {
    await this.connect();
    return BlogComment.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      { isDeleted: true },
      { new: true }
    );
  }

  /**
   * Like comment
   */
  async like(commentId: string): Promise<BlogCommentDocument | null> {
    await this.connect();
    return BlogComment.findByIdAndUpdate(
      new Types.ObjectId(commentId),
      { $inc: { likes: 1 } },
      { new: true }
    );
  }

  /**
   * Get comment count for blog
   */
  async getCommentCount(blogId: string): Promise<number> {
    await this.connect();
    return BlogComment.countDocuments({
      blog: new Types.ObjectId(blogId),
      status: "approved",
      isDeleted: false,
    });
  }
}

export const blogCommentRepository = new BlogCommentRepository();
