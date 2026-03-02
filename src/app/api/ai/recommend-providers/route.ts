import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import { recommendProvidersForClient } from "@/lib/openai";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ProviderProfile from "@/models/ProviderProfile";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  await connectDB();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const budget = Number(searchParams.get("budget") ?? 0);

  // Fetch client's completed job history for context
  const clientHistory = await jobRepository.findCompletedForClient(user.userId, 10);

  // Find approved providers whose skills include the category keyword
  const categoryRegex = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const profiles = await ProviderProfile.find({
    $or: [
      { skills: { $elemMatch: { $regex: categoryRegex } } },
      { bio: { $regex: categoryRegex } },
    ],
    availabilityStatus: { $ne: "unavailable" },
  })
    .select("userId bio skills avgRating completedJobCount hourlyRate")
    .limit(15)
    .lean();

  if (profiles.length === 0) {
    return NextResponse.json({ providers: [] });
  }

  const userIds = profiles.map((p) => (p as { userId: { toString(): string } }).userId.toString());

  // Fetch user names and avatars
  const users = await User.find({ _id: { $in: userIds }, approvalStatus: "approved", isSuspended: false })
    .select("name avatar")
    .lean();

  const userMap = new Map(users.map((u) => [String((u as { _id: { toString(): string } })._id), u as { name: string; avatar?: string }]));

  const candidates = profiles
    .map((p) => {
      const profile = p as {
        userId: { toString(): string };
        bio: string;
        skills: string[];
        avgRating?: number;
        completedJobCount?: number;
        hourlyRate?: number;
      };
      const uid = profile.userId.toString();
      const uData = userMap.get(uid);
      if (!uData) return null;
      return {
        id: uid,
        name: uData.name,
        avatar: uData.avatar ?? null,
        skills: profile.skills ?? [],
        bio: profile.bio ?? "",
        avgRating: profile.avgRating ?? 0,
        completedJobCount: profile.completedJobCount ?? 0,
        hourlyRate: profile.hourlyRate,
      };
    })
    .filter(Boolean) as Array<{
      id: string; name: string; avatar: string | null;
      skills: string[]; bio: string; avgRating: number;
      completedJobCount: number; hourlyRate?: number;
    }>;

  if (candidates.length === 0) {
    return NextResponse.json({ providers: [] });
  }

  const ranked = await recommendProvidersForClient({
    category,
    budget,
    clientHistory,
    providers: candidates,
  });

  // Merge ranked results with candidate metadata
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const providers = ranked.map((r) => {
    const c = candidateMap.get(r.providerId);
    return {
      providerId: r.providerId,
      name: c?.name ?? "",
      avatar: c?.avatar ?? null,
      avgRating: c?.avgRating ?? 0,
      completedJobCount: c?.completedJobCount ?? 0,
      reason: r.reason,
    };
  });

  return NextResponse.json({ providers });
});
