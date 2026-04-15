import { NextRequest, NextResponse } from "next/server";
import { blogAnalyticsRepository } from "@/repositories/blog-analytics.repository";

/**
 * GET /api/admin/analytics
 * Get blog analytics dashboard (admin)
 * 
 * Query params:
 * - metric: "top-articles" | "referrers"
 * - blogId: (optional) specific blog analytics
 * - dateFrom: (optional) ISO date string (YYYY-MM-DD)
 * - dateTo: (optional) ISO date string (YYYY-MM-DD)
 * - limit: (optional) number of results (default: 10)
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin
    const searchParams = req.nextUrl.searchParams;
    const blogId = searchParams.get("blogId");
    const metric = searchParams.get("metric");
    const limit = parseInt(searchParams.get("limit") || "10");
    // Date range parameters (optional)
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Parse dates if provided
    const dateRange = dateFrom && dateTo 
      ? {
          from: new Date(dateFrom),
          to: new Date(dateTo),
        }
      : undefined;

    if (metric === "top-articles") {
      const topArticles = await blogAnalyticsRepository.getTopArticles(limit, dateRange);
      return NextResponse.json({ articles: topArticles });
    }

    if (metric === "referrers") {
      // Support both blog-specific and global referrers
      const referrers = blogId
        ? await blogAnalyticsRepository.getTopReferrers(blogId, limit, dateRange)
        : await blogAnalyticsRepository.getAllTopReferrers(limit, dateRange);
      return NextResponse.json({ referrers });
    }

    if (blogId) {
      // Default: blog-specific analytics
      const analytics = await blogAnalyticsRepository.getBlogAnalytics(blogId, dateRange);
      return NextResponse.json(analytics);
    }

    // If no specific metrics requested, return global dashboard stats
    const topArticles = await blogAnalyticsRepository.getTopArticles(5, dateRange);
    const referrers = await blogAnalyticsRepository.getAllTopReferrers(5, dateRange);
    
    return NextResponse.json({
      articles: topArticles,
      referrers,
      metric: "dashboard"
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
