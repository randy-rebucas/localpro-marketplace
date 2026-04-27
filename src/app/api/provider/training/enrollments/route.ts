import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { trainingService } from "@/services/training.service";

import { checkRateLimit } from "@/lib/rateLimit";
/**
 * GET /api/provider/training/enrollments
 * Returns all training enrollments for the requesting provider.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const rl = await checkRateLimit(`provider:training:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const enrollments = await trainingService.getMyEnrollments(user);
  return NextResponse.json({ enrollments });
});
