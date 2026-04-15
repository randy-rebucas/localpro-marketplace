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
  async getBlogAnalytics(blogId: string): Promise<{
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await BlogAnalytic.aggregate([
      {
        $match: {
          blog: new Types.ObjectId(blogId),
          createdAt: { $gte: sevenDaysAgo },
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
          createdAt: { $gte: sevenDaysAgo },
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
   * Get top performing articles
   */
  async getTopArticles(
    limit: number = 10
  ): Promise<
    Array<{
      blogId: string;
      totalViews: number;
      avgReadTime: number;
      avgScrollDepth: number;
      uniqueVisitors: number;
    }>
  > {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const results = await BlogAnalytic.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$blog",
          totalViews: { $sum: "$viewCount" },
          avgReadTime: { $avg: "$avgReadTime" },
          avgScrollDepth: { $avg: "$avgScrollDepth" },
          uniqueVisitors: { $sum: 1 },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: limit },
    ]);

    return results.map((r) => ({
      blogId: r._id.toString(),
      totalViews: r.totalViews,
      avgReadTime: Math.round(r.avgReadTime),
      avgScrollDepth: Math.round(r.avgScrollDepth),
      uniqueVisitors: r.uniqueVisitors,
    }));
  }

  /**
   * Get referral traffic sources
   */
  async getTopReferrers(blogId: string, limit: number = 10) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const results = await BlogAnalytic.aggregate([
      {
        $match: {
          blog: new Types.ObjectId(blogId),
          createdAt: { $gte: sevenDaysAgo },
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

    return results.map((r) => ({
      referrer: r._id,
      count: r.count,
    }));
  }
}

export const blogAnalyticsRepository = new BlogAnalyticsRepository();
