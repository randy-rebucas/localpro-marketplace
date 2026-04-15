import { NextRequest, NextResponse } from "next/server";
import { blogAnalyticsRepository } from "@/repositories/blog-analytics.repository";

/**
 * GET /api/admin/analytics
 * Get blog analytics dashboard (admin)
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin
    const searchParams = req.nextUrl.searchParams;
    const blogId = searchParams.get("blogId");
    const metric = searchParams.get("metric");

    if (metric === "top-articles") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const topArticles = await blogAnalyticsRepository.getTopArticles(limit);
      return NextResponse.json({ articles: topArticles });
    }

    if (blogId) {
      if (metric === "referrers") {
        const limit = parseInt(searchParams.get("limit") || "10");
        const referrers = await blogAnalyticsRepository.getTopReferrers(
          blogId,
          limit
        );
        return NextResponse.json({ referrers });
      }

      // Default: blog-specific analytics
      const analytics = await blogAnalyticsRepository.getBlogAnalytics(blogId);
      return NextResponse.json(analytics);
    }

    return NextResponse.json(
      { error: "Missing blogId or valid metric parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
