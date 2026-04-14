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
      jobData: { category, description, location, budgetMin, budgetMax },
    } = body;

    // Validate required fields
    if (!category || !location) {
      return NextResponse.json(
        { error: "Missing required fields for urgent service" },
        { status: 400 }
      );
    }

    // Search providers who offer this service type
    const providers = await searchProvidersForJob({
      title: `Urgent ${category} service`,
      category,
      location,
      description: description || "",
      budget: budgetMax || 5000,
      urgency: "rush",
    });

    // Filter and prioritize for urgent availability
    // Criteria: High rating, responsive, available NOW or within 2 hours
    const urgentProviders = providers
      .map((provider) => {
        const rating = provider.profile?.avgRating || 0;
        // Estimate arrival time based on rating
        const etaMinutes = rating > 4.7 ? 15 : rating > 4.5 ? 20 : 30;
        
        return {
          providerId: provider.providerId,
          name: provider.user?.name || "Provider",
          rating: rating,
          matchScore: provider.matchScore,
          responseTime: `${etaMinutes}m`,
          urgentBadge: rating >= 4.7,
          reason: provider.reason,
        };
      })
      .sort((a, b) => (b.rating - a.rating)) // Sort by rating
      .slice(0, 5); // Top 5 specialists

    if (urgentProviders.length === 0) {
      return NextResponse.json(
        {
          message:
            "No providers available for urgent service right now. Standard booking recommended.",
          providers: [],
          nextAction: "CONTINUE_CHAT",
        },
        { status: 200 }
      );
    }

    // Best match (highest rating)
    const bestMatch = urgentProviders[0];

    return NextResponse.json({
      message: `⚡ Found ${urgentProviders.length} providers available for urgent ${category} service. ${bestMatch?.name || "A provider"} can help you right away!`,
      urgentProviders,
      bestMatch: bestMatch ? {
        providerId: bestMatch.providerId,
        name: bestMatch.name,
        eta: bestMatch.responseTime,
        rating: bestMatch.rating,
      } : null,
      premiumOption: {
        available: true,
        extraFee: "₱250-₱500",
        benefit: "Priority dispatch + guaranteed arrival in 15 minutes",
      },
      nextAction: "SELECT_URGENT_PROVIDER",
    });
  } catch (error) {
    console.error("[Urgent Service] Error:", error);
    return NextResponse.json(
      { error: "Failed to find urgent service providers" },
      { status: 500 }
    );
  }
}
