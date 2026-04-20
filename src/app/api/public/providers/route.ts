import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

const PAGE_SIZE = 24;

interface ProviderCard {
  _id: string;
  name: string;
  avatar: string | null;
  bio: string;
  skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
  city: string;
  yearsExperience: number;
  hourlyRate: number | null;
  availabilityStatus: string;
}

/**
 * GET /api/public/providers
 * Public endpoint to browse service providers with filtering
 * Query params: q (search), skill, page
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q")?.trim() ?? "";
    const skill = searchParams.get("skill")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    // Build provider profile filter
    const profileFilter: Record<string, unknown> = {};
    if (skill) profileFilter["skills.skill"] = skill;

    const providersQuery = await ProviderProfile.find(profileFilter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({
        path: "userId",
        match: {
          role: "provider",
          approvalStatus: "approved",
          isSuspended: { $ne: true },
          isDeleted: { $ne: true },
          ...(search ? { name: { $regex: search, $options: "i" } } : {}),
        },
        select: "name avatar",
      })
      .select("_id userId bio skills yearsExperience hourlyRate availabilityStatus serviceAreas")
      .lean();

    // Filter out nulled userId (didn't match user filter)
    const valid = providersQuery.filter((p) => p.userId !== null);

    // Count total for pagination
    const total = await ProviderProfile.countDocuments(profileFilter);

    // Get top skills
    const topSkills = (
      await ProviderProfile.aggregate([
        { $unwind: "$skills" },
        { $group: { _id: "$skills.skill", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
    ).map((s: { _id: string }) => s._id);

    // Transform to ProviderCard format
    const providers: ProviderCard[] = valid.map((p) => {
      const user = p.userId as { _id?: unknown; name?: string; avatar?: string | null } | null;
      const areas = (p as { serviceAreas?: { address?: string }[] }).serviceAreas;
      const skillsArray = Array.isArray(p.skills)
        ? (p.skills as unknown as Array<{ skill: string; yearsExperience: number; hourlyRate: string }>)
        : [];
      return {
        _id: String(user?._id ?? (p as { _id: unknown })._id),
        name: user?.name ?? "Provider",
        avatar: user?.avatar ?? null,
        bio: p.bio ?? "",
        skills: skillsArray,
        city: areas?.[0]?.address ?? "Philippines",
        yearsExperience: p.yearsExperience ?? 0,
        hourlyRate: p.hourlyRate ?? null,
        availabilityStatus: p.availabilityStatus ?? "available",
      };
    });

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return NextResponse.json(
      {
        providers,
        total,
        topSkills,
        page,
        pageSize: PAGE_SIZE,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching public providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
