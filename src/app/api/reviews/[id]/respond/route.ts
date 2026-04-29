import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const RespondSchema = z.object({
  response: z.string().min(1).max(500),
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  requireRole(user, "provider");

  const { id } = await params;
  assertObjectId(id, "reviewId");
  const body = await req.json().catch(() => ({}));
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const review = await reviewService.respondToReview(user, id, parsed.data.response);
  return NextResponse.json(review);
});
