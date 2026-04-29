import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const BreakdownSchema = z.object({
  quality:         z.number().int().min(1).max(5) as z.ZodType<1|2|3|4|5>,
  professionalism: z.number().int().min(1).max(5) as z.ZodType<1|2|3|4|5>,
  punctuality:     z.number().int().min(1).max(5) as z.ZodType<1|2|3|4|5>,
  communication:   z.number().int().min(1).max(5) as z.ZodType<1|2|3|4|5>,
});

const CreateReviewSchema = z.object({
  jobId:     z.string().min(1),
  rating:    z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  feedback:  z.string().min(10).max(500),
  breakdown: BreakdownSchema.optional(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`reviews-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId") ?? undefined;
  // Validate format before passing to service to avoid Mongoose CastError on bad input
  if (providerId && !/^[a-f\d]{24}$/i.test(providerId)) {
    return NextResponse.json({ reviews: [] });
  }

  const reviews = await reviewService.listReviews(user, { providerId });
  return NextResponse.json(reviews);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "client");

  const rl = await checkRateLimit(`reviews-post:${user.userId}`, { windowMs: 3_600_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateReviewSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const review = await reviewService.submitReview(user, parsed.data);
  return NextResponse.json(review, { status: 201 });
});
