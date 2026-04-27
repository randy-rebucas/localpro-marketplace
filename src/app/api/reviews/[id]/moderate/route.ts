import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const ModerateSchema = z.object({
  hide: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const PUT = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  // Admin/staff capability check is done inside moderateReview()

  const { id } = await params;
  assertObjectId(id, "reviewId");
  const body = await req.json().catch(() => ({}));
  const parsed = ModerateSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const review = await reviewService.moderateReview(user, id, parsed.data);
  return NextResponse.json(review);
});
