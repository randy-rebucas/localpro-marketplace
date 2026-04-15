import BlogAnalytic, { type BlogAnalyticDocument } from "@/models/BlogAnalytic";
import { Types } from "mongoose";

/**
 * Blog Analytics Repository
 * 
 * Data access for blog analytics and engagement tracking
 */
export class BlogAnalyticsRepository {
  /**
   * Track page view
   */
  async trackPageView(data: {
    blogId: string;
    sessionId: string;
    userId?: string;
    readTime?: number;
    scrollDepth?: number;
    referrer?: string;
  }): Promise<BlogAnalyticDocument> {
    const existing = await BlogAnalytic.findOne({
      blog: new Types.ObjectId(data.blogId),
      sessionId: data.sessionId,
    });

    if (existing) {
      // Update existing session
      existing.viewCount = (existing.viewCount || 0) + 1;
      existing.returnVisits = (existing.returnVisits || 0) + 1;
      if (data.readTime) {
        existing.avgReadTime =
          (existing.avgReadTime + data.readTime) / existing.viewCount;
      }
      if (data.scrollDepth) {
        existing.avgScrollDepth =
          (existing.avgScrollDepth + data.scrollDepth) / existing.viewCount;
      }
      existing.lastViewedAt = new Date();
      await existing.save();
      return existing;
    } else {
      // Create new tracking record
      const analytic = new BlogAnalytic({
        blog: new Types.ObjectId(data.blogId),
        sessionId: data.sessionId,
        userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
        viewCount: 1,
        avgReadTime: data.readTime || 0,
        avgScrollDepth: data.scrollDepth || 0,
        referrer: data.referrer,
      });

      await analytic.save();
      return analytic;
    }
  }

  /**
   * Get analytics for a specific blog
   */
  async getBlogAnalytics(
    blogId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalViews: number;
    avgReadTime: number;
    avgScrollDepth: number;
    uniqueSessions: number;
    trendsLast7Days: Array<{
      date: string;
      views: number;
      avgReadTime: number;
    }>;
  }> {
    const dateFrom = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.to || new Date();

    const stats = await BlogAnalytic.aggregate([
      {
        $match: {
          blog: new Types.ObjectId(blogId),
          createdAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
          avgReadTime: { $avg: "$avgReadTime" },
          avgScrollDepth: { $avg: "$avgScrollDepth" },
          uniqueSessions: { $sum: 1 },
        },
      },
    ]);

    const trends = await BlogAnalytic.aggregate([
      {
        $match: {
          blog: new Types.ObjectId(blogId),
          createdAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          views: { $sum: "$viewCount" },
          avgReadTime: { $avg: "$avgReadTime" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalViews: stats[0]?.totalViews || 0,
      avgReadTime: Math.round(stats[0]?.avgReadTime || 0),
      avgScrollDepth: Math.round(stats[0]?.avgScrollDepth || 0),
      uniqueSessions: stats[0]?.uniqueSessions || 0,
      trendsLast7Days: trends.map((t) => ({
        date: t._id,
        views: t.views,
        avgReadTime: Math.round(t.avgReadTime),
      })),
    };
  }

  /**
   * Get top performing articles with date range support
   */
  async getTopArticles(
    limit: number = 10,
    dateRange?: { from: Date; to: Date }
  ): Promise<
    Array<{
      blogId: string;
      title: string;
      slug: string;
      views: number;
      avgReadTime: number;
      avgScrollDepth: number;
      returnVisits: number;
      latestView: string;
    }>
  > {
    // Default to last 30 days if no date range provided
    const dateFrom = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.to || new Date();

    const results = await BlogAnalytic.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFrom, $lte: dateTo },
        },
      },
      {
        $group: {
          _id: "$blog",
          totalViews: { $sum: "$viewCount" },
          avgReadTime: { $avg: "$avgReadTime" },
          avgScrollDepth: { $avg: "$avgScrollDepth" },
          returnVisits: { $sum: "$returnVisits" },
          latestView: { $max: "$lastViewedAt" },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "blogs",
          localField: "_id",
          foreignField: "_id",
          as: "blog",
        },
      },
      { $unwind: { path: "$blog", preserveNullAndEmptyArrays: true } },
    ]);

    return results.map((r) => ({
      blogId: r._id.toString(),
      title: r.blog?.title || "Untitled Article",
      slug: r.blog?.slug || "",
      views: r.totalViews || 0,
      avgReadTime: r.avgReadTime ? Math.round(r.avgReadTime * 10) / 10 : 0,
      avgScrollDepth: r.avgScrollDepth ? Math.round(r.avgScrollDepth) : 0,
      returnVisits: r.returnVisits || 0,
      latestView: r.latestView ? new Date(r.latestView).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Get referral traffic sources for a specific blog
   */
  async getTopReferrers(
    blogId: string,
    limit: number = 10,
    dateRange?: { from: Date; to: Date }
  ): Promise<
    Array<{
      referrer: string;
      count: number;
      percentage: number;
    }>
  > {
    const dateFrom = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.to || new Date();

    const results = await BlogAnalytic.aggregate([
      {
        $match: {
          blog: new Types.ObjectId(blogId),
          createdAt: { $gte: dateFrom, $lte: dateTo },
          referrer: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$referrer",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      referrer: r._id || "direct",
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    }));
  }

  /**
   * Get referral traffic sources globally (across all blogs)
   */
  async getAllTopReferrers(
    limit: number = 10,
    dateRange?: { from: Date; to: Date }
  ): Promise<
    Array<{
      referrer: string;
      count: number;
      percentage: number;
    }>
  > {
    const dateFrom = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.to || new Date();

    const results = await BlogAnalytic.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFrom, $lte: dateTo },
          referrer: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$referrer",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      referrer: r._id || "direct",
      count: r.count,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    }));
  }
}

export const blogAnalyticsRepository = new BlogAnalyticsRepository();
