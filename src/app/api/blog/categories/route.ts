/**
 * GET /api/blog/categories
 * 
 * Get all blog categories with counts
 */

import { blogRepository } from "@/repositories";
import { apiResponse, withHandler } from "@/lib/utils";

export const GET = withHandler(async () => {
  try {
    const categories = await blogRepository.getCategoryStats();
    
    return apiResponse({
      categories,
      total: categories.length,
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return apiResponse(
      { error: "Failed to fetch categories" },
      500
    );
  }
});
