import { NextRequest, NextResponse } from "next/server";
import { providerProfileService } from "@/services";
import { reviewRepository } from "@/repositories";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const rl = await checkRateLimit(`prov-profile:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  assertObjectId(id, "providerId");
  const [profile, breakdown, streak] = await Promise.all([
    providerProfileService.getProfile(id),
    reviewRepository.getProviderBreakdownSummary(id),
    reviewRepository.getFiveStarStreak(id),
  ]);
  return NextResponse.json({ ...profile, breakdown, streak });
});
