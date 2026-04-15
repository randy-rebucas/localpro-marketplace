import { NextRequest, NextResponse } from "next/server";
import { blogAnalyticsRepository } from "@/repositories/blog-analytics.repository";
import { z } from "zod";

/**
 * POST /api/blog/[blogId]/track-view
 * Track page view and engagement metrics (public)
 */
const trackViewSchema = z.object({
  sessionId: z.string().min(1),
  readTime: z.number().optional(),
  scrollDepth: z.number().min(0).max(100).optional(),
  referrer: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;
    const body = await req.json();

    const validated = trackViewSchema.parse(body);

    await blogAnalyticsRepository.trackPageView({
      blogId,
      sessionId: validated.sessionId,
      readTime: validated.readTime,
      scrollDepth: validated.scrollDepth,
      referrer: validated.referrer,
    });

    return NextResponse.json(
      { message: "Page view tracked" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error tracking page view:", error);
    // Don't expose error to client, silently fail
    return NextResponse.json(
      { message: "Page view tracked" },
      { status: 200 }
    );
  }
}
