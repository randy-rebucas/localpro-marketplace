import { NextRequest, NextResponse } from "next/server";
import { blogAnalyticsRepository } from "@/repositories/blog-analytics.repository";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

/**
 * POST /api/blog/[blogId]/track-view
 * Track page view and engagement metrics (public)
 */
const trackViewSchema = z.object({
  sessionId:   z.string().min(1).max(128),
  readTime:    z.number().min(0).max(86400).optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  referrer:    z.string().max(500).optional(),
});

export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ blogId: string }> }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = await checkRateLimit(`blog-track-view:${ip}`, { windowMs: 60_000, max: 60 });
    if (!rl.ok) return NextResponse.json({ message: "Page view tracked" });

    const { blogId } = await params;
    assertObjectId(blogId, "blogId");

    const body = await req.json();
    const parsed = trackViewSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

    await blogAnalyticsRepository.trackPageView({
      blogId,
      sessionId:   parsed.data.sessionId,
      readTime:    parsed.data.readTime,
      scrollDepth: parsed.data.scrollDepth,
      referrer:    parsed.data.referrer,
    });

    return NextResponse.json({ message: "Page view tracked" });
  }
);
