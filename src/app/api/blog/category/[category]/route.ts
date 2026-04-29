/**
 * GET /api/blog/category/[category]
 *
 * Get blogs for a specific category with pagination (public)
 */

import { NextRequest, NextResponse } from "next/server";
import { blogRepository } from "@/repositories";
import { apiResponse, withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ category: string }> }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`blog-category:${ip}`, { windowMs: 60_000, max: 60 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { category } = await params;
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12));

    const result = await blogRepository.findByCategory(category, page, limit);
    return apiResponse(result);
  }
);
