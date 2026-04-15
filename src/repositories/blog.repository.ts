import Blog, { type BlogDocument, type IBlog } from "@/models/Blog";
import { Types } from "mongoose";

/**
 * Blog Repository
 * 
 * Data access layer for blog operations.
 * Handles all CRUD operations and domain-specific queries.
 */
export class BlogRepository {
  /**
   * Find all blogs (admin view) with pagination and filters
   */
  async findAll(
    filters: {
      status?: "draft" | "published" | "scheduled" | "archived";
      author?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ blogs: BlogDocument[]; total: number; page: number; limit: number }> {
    const {
      status,
      author,
      search,
      page = 1,
      limit = 10,
    } = filters;

    // Build query
    const query: any = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (author) {
      query.author = new Types.ObjectId(author);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email")
        .lean(),
      Blog.countDocuments(query),
    ]);

    return {
      blogs: blogs as unknown as BlogDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Find blog by ID
   */
  async findById(id: string): Promise<BlogDocument | null> {
    return Blog.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).populate("author", "name email");
  }

  /**
   * Find blog by slug (for public pages)
   */
  async findBySlug(slug: string): Promise<BlogDocument | null> {
    // First try to find published blogs (production mode)
    let blog = await Blog.findOne({
      slug,
      status: "published",
      publishedAt: { $lte: new Date() },
      isDeleted: false,
    }).populate("author", "name email");

    // In development, fallback to finding any non-deleted blog with this slug
    // to help with testing and development
    if (!blog && process.env.NODE_ENV === "development") {
      console.warn(`[Blog Repo] No published blog found for slug: ${slug}. Falling back to draft/scheduled in development.`);
      blog = await Blog.findOne({
        slug,
        isDeleted: false,
      }).populate("author", "name email");
    }

    return blog;
  }

  /**
   * Find blogs by category
   */
  async findByCategory(
    category: string,
    pageOrFilters?: number | { page?: number; limit?: number },
    limitOrUndefined?: number
  ): Promise<{ blogs: BlogDocument[]; total: number; page: number; limit: number }> {
    // Handle flexible parameters
    let page = 1;
    let limit = 12;

    if (typeof pageOrFilters === "number") {
      page = pageOrFilters;
      limit = limitOrUndefined || 12;
    } else if (pageOrFilters) {
      page = pageOrFilters.page || 1;
      limit = pageOrFilters.limit || 12;
    }

    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      Blog.find({
        category,
        status: "published",
        publishedAt: { $lte: new Date() },
        isDeleted: false,
      })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email")
        .lean(),
      Blog.countDocuments({
        category,
        status: "published",
        publishedAt: { $lte: new Date() },
        isDeleted: false,
      }),
    ]);

    return {
      blogs: blogs as unknown as BlogDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get all categories with counts
   */
  async getCategoryStats(): Promise<
    { category: string; count: number; label: string }[]
  > {
    const stats = await Blog.aggregate([
      {
        $match: {
          status: "published",
          publishedAt: { $lte: new Date() },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const categoryLabels: Record<string, string> = {
      news: "News",
      tutorial: "Tutorials",
      "tips-tricks": "Tips & Tricks",
      "service-update": "Service Updates",
      "provider-story": "Provider Stories",
      "client-story": "Client Stories",
      "industry-insights": "Industry Insights",
      announcement: "Announcements",
      other: "Other",
    };

    return stats.map((stat) => ({
      category: stat._id,
      count: stat.count,
      label: categoryLabels[stat._id] || stat._id,
    }));
  }

  /**
   * Find all published blogs for public listing
   */
  async findPublished(
    pageOrFilters?: number | { page?: number; limit?: number; search?: string },
    limitOrUndefined?: number,
    search?: string
  ): Promise<{ blogs: BlogDocument[]; total: number; page: number; limit: number }> {
    // Handle flexible parameters: findPublished(page, limit, search) or findPublished(filters)
    let page = 1;
    let limit = 10;
    let searchQuery = "";

    if (typeof pageOrFilters === "number") {
      // Called with (page, limit, search)
      page = pageOrFilters;
      limit = limitOrUndefined || 10;
      searchQuery = search || "";
    } else if (pageOrFilters) {
      // Called with filters object
      page = pageOrFilters.page || 1;
      limit = pageOrFilters.limit || 10;
      searchQuery = pageOrFilters.search || "";
    }

    const skip = (page - 1) * limit;

    const query: any = {
      status: "published",
      publishedAt: { $lte: new Date() }, // Only show published or past scheduled
      isDeleted: false,
    };

    // Add search to query if provided
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { excerpt: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email")
        .lean(),
      Blog.countDocuments(query),
    ]);

    return {
      blogs: blogs as unknown as BlogDocument[],
      total,
      page,
      limit,
    };
  }

  /**
   * Create new blog
   */
  async create(data: Partial<IBlog>): Promise<BlogDocument> {
    const blog = new Blog(data);
    return blog.save();
  }

  /**
   * Update blog by ID
   */
  async updateById(id: string, data: Partial<IBlog>): Promise<BlogDocument | null> {
    // Allowlist to prevent mass-assignment
    const allowedFields = [
      "title",
      "content",
      "excerpt",
      "featuredImage",
      "category",
      "metaDescription",
      "keywords",
      "status",
      "scheduledFor",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field as keyof IBlog];
      }
    }

    return Blog.findByIdAndUpdate(
      new Types.ObjectId(id),
      updateData,
      { new: true }
    ).populate("author", "name email");
  }

  /**
   * Publish blog immediately
   */
  async publish(id: string): Promise<BlogDocument | null> {
    return Blog.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        status: "published",
        publishedAt: new Date(),
        scheduledFor: null,
      },
      { new: true }
    ).populate("author", "name email");
  }

  /**
   * Schedule blog for future publishing
   */
  async schedule(id: string, scheduledFor: Date): Promise<BlogDocument | null> {
    return Blog.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        status: "scheduled",
        scheduledFor,
      },
      { new: true }
    ).populate("author", "name email");
  }

  /**
   * Archive blog (hide from public but keep in records)
   */
  async archive(id: string): Promise<BlogDocument | null> {
    return Blog.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        status: "archived",
      },
      { new: true }
    ).populate("author", "name email");
  }

  /**
   * Soft delete blog
   */
  async delete(id: string): Promise<BlogDocument | null> {
    return Blog.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Hard delete blog (use with caution)
   */
  async hardDelete(id: string): Promise<{ deletedCount: number }> {
    const result = await Blog.deleteOne({ _id: new Types.ObjectId(id) });
    return { deletedCount: result.deletedCount };
  }

  /**
   * Find blogs to be auto-published (scheduled blogs whose time has come)
   */
  async findScheduledToPublish(): Promise<BlogDocument[]> {
    return Blog.find({
      status: "scheduled",
      scheduledFor: { $lte: new Date() },
      isDeleted: false,
    });
  }

  /**
   * Auto-publish scheduled blogs (typically run via cron)
   */
  async autoPublishScheduled(): Promise<number> {
    const result = await Blog.updateMany(
      {
        status: "scheduled",
        scheduledFor: { $lte: new Date() },
        isDeleted: false,
      },
      {
        $set: {
          status: "published",
          publishedAt: new Date(),
        },
      }
    );
    return result.modifiedCount;
  }

  /**
   * Count blogs by status
   */
  async countByStatus(
    status: "draft" | "published" | "scheduled" | "archived"
  ): Promise<number> {
    return Blog.countDocuments({
      status,
      isDeleted: false,
    });
  }

  /**
   * Get blog statistics for dashboard
   */
  async getStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    scheduled: number;
    archived: number;
  }> {
    const [total, published, draft, scheduled, archived] = await Promise.all([
      Blog.countDocuments({ isDeleted: false }),
      Blog.countDocuments({ status: "published", isDeleted: false }),
      Blog.countDocuments({ status: "draft", isDeleted: false }),
      Blog.countDocuments({ status: "scheduled", isDeleted: false }),
      Blog.countDocuments({ status: "archived", isDeleted: false }),
    ]);

    return { total, published, draft, scheduled, archived };
  }

  /**
   * Debug: Check if a blog with the given slug exists and why it might not be visible
   */
  async debugFindBySlug(slug: string): Promise<{
    bySlug: BlogDocument | null;
    allWithSlug: BlogDocument[];
    published: BlogDocument | null;
    stats: { total: number; withSlug: number; publishedWithSlug: number };
  }> {
    const bySlug = await Blog.findOne({ slug }).populate("author", "name email");
    const allWithSlug = await Blog.find({ slug }).populate("author", "name email");
    const published = await Blog.findOne({
      slug,
      status: "published",
      publishedAt: { $lte: new Date() },
      isDeleted: false,
    }).populate("author", "name email");

    return {
      bySlug,
      allWithSlug,
      published,
      stats: {
        total: await Blog.countDocuments({}),
        withSlug: allWithSlug.length,
        publishedWithSlug: published ? 1 : 0,
      },
    };
  }
}

export const blogRepository = new BlogRepository();
