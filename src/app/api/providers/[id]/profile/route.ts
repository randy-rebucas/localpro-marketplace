import { NextRequest, NextResponse } from "next/server";
import { providerProfileService } from "@/services";
import { reviewRepository } from "@/repositories";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const [profile, breakdown, streak] = await Promise.all([
    providerProfileService.getProfile(id),
    reviewRepository.getProviderBreakdownSummary(id),
    reviewRepository.getFiveStarStreak(id),
  ]);
  return NextResponse.json({ ...profile, breakdown, streak });
});
