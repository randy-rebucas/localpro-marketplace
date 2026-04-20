import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

const PAGE_SIZE = 24;

interface ProviderResult {
  _id: string;
  name: string; // Provider's business name (from User.name)
  avatar: string | null;
  bio: string;
  skills: Array<{ skill: string; yearsExperience: number }>;
  city: string;
  yearsExperience: number;
  hourlyRate: number | null;
  availabilityStatus: string;
}

/**
 * GET /api/providers/search
 * 
 * Search for service providers by name and filter by skill
 * 
 * Query Parameters:
 * - q: Search query (searches provider name)
 * - skill: Filter by specific skill
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 24, max: 100)
 * 
 * Returns:
 * - providers: Array of provider cards
 * - total: Total count of providers matching filters
 * - page: Current page number
 * - pageSize: Results per page
 * - topSkills: Top 20 most common skills
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q")?.trim() ?? "";
    const skill = searchParams.get("skill")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10));

    // Build provider profile filter
    const profileFilter: Record<string, unknown> = {};
    if (skill) profileFilter["skills.skill"] = skill;

    // Query provider profiles with populated user data
    const providersQuery = await ProviderProfile.find(profileFilter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "userId",
        match: {
          role: "provider",
          approvalStatus: "approved",
          isSuspended: { $ne: true },
          isDeleted: { $ne: true },
          // Search by provider name (from User model)
          ...(search ? { name: { $regex: search, $options: "i" } } : {}),
        },
        select: "name avatar",
      })
      .select(
        "_id userId bio skills yearsExperience hourlyRate availabilityStatus serviceAreas"
      )
      .lean();

    // Filter out nulled userId (didn't match user filter)
    const valid = providersQuery.filter((p) => p.userId !== null);

    // Count total for pagination
    const total = await ProviderProfile.countDocuments(profileFilter);

    // Get top skills for sidebar filtering
    const topSkills = (
      await ProviderProfile.aggregate([
        { $unwind: "$skills" },
        { $group: { _id: "$skills.skill", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
    ).map((s: { _id: string }) => s._id);

    // Map results to provider card format
    const providers: ProviderResult[] = valid.map((p) => {
      const user = p.userId as { _id?: unknown; name?: string; avatar?: string | null } | null;
      const areas = (p as { serviceAreas?: { address?: string }[] }).serviceAreas;
      const skillsArray = Array.isArray(p.skills)
        ? (p.skills as unknown as Array<{ skill: string; yearsExperience: number }>)
        : [];

      return {
        _id: String(user?._id ?? (p as { _id: unknown })._id),
        name: user?.name ?? "Provider", // Provider's business name from User.name
        avatar: user?.avatar ?? null,
        bio: p.bio ?? "",
        skills: skillsArray,
        city: areas?.[0]?.address ?? "Philippines",
        yearsExperience: p.yearsExperience ?? 0,
        hourlyRate: p.hourlyRate ?? null,
        availabilityStatus: p.availabilityStatus ?? "available",
      };
    });

    return NextResponse.json(
      {
        success: true,
        providers: JSON.parse(JSON.stringify(providers)),
        total,
        page,
        pageSize: limit,
        topSkills,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PROVIDER_SEARCH_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch providers",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
