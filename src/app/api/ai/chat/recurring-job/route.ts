import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { searchProvidersForJob } from "@/lib/chat-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const {
      jobData: {
        category,
        description,
        location,
        frequency,
        budgetMin,
        budgetMax,
      },
    } = body;

    // Validate required fields for recurring service
    if (!category || !frequency || !location) {
      return NextResponse.json(
        { error: "Missing required fields for recurring service" },
        { status: 400 }
      );
    }

    // Search providers who offer services in this category
    const providers = await searchProvidersForJob({
      title: `Recurring ${category} service`,
      category,
      location,
      description: description || "",
      budget: budgetMax || 5000,
    });

    // Filter providers with recurring availability
    const recurringProviders = providers
      .map((provider) => ({
        providerId: provider.providerId,
        name: provider.user?.name || "Provider",
        rating: provider.profile?.avgRating || 0,
        matchScore: provider.matchScore || 0,
        reason: provider.reason,
      }))
      .slice(0, 5)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return top 5 matches

    if (recurringProviders.length === 0) {
      return NextResponse.json(
        {
          message: "No providers currently available for recurring service",
          providers: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: `Found ${recurringProviders.length} providers who offer ${frequency} ${category} services`,
      providers: recurringProviders,
      frequency,
      category,
      budgetRange: {
        min: budgetMin,
        max: budgetMax,
      },
      nextAction: "SELECT_RECURRING_PROVIDER",
    });
  } catch (error) {
    console.error("[AI Chat] Recurring job search failed:", error);
    return NextResponse.json(
      { error: "Failed to search recurring service providers" },
      { status: 500 }
    );
  }
}
