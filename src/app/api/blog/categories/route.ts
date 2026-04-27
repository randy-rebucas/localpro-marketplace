/**
 * GET /api/blog/categories
 *
 * Get all blog categories with counts (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { blogRepository } from "@/repositories";
import { apiResponse, withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`blog-categories:${ip}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const categories = await blogRepository.getCategoryStats();
  return apiResponse({ categories, total: categories.length });
});
