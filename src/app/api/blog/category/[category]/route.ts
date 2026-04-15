/**
 * GET /api/blog/category/[category]
 * 
 * Get blogs for a specific category with pagination
 */

import { blogRepository } from "@/repositories";
import { apiResponse, withHandler } from "@/lib/utils";

export const GET = withHandler(async (req, ctx: any) => {
  try {
    const params = await ctx.params;
    const category = params.category;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return apiResponse(
        { error: "Invalid pagination parameters" },
        400
      );
    }

    const result = await blogRepository.findByCategory(category, page, limit);

    return apiResponse(result);
  } catch (error) {
    console.error("Failed to fetch category blogs:", error);
    return apiResponse(
      { error: "Failed to fetch blogs" },
      500
    );
  }
});
