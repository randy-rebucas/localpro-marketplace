import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { searchProvidersForJob } from "@/lib/chat-dispatcher";
import { checkRateLimit } from "@/lib/rateLimit";
import { ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:urgent-service:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const {
    jobData: { category, description, location, budgetMin, budgetMax } = {} as any,
  } = body;

  if (!category || !location) {
    throw new ValidationError("Missing required fields for urgent service");
  }

  const providers = await searchProvidersForJob({
    title: `Urgent ${category} service`,
    category,
    location,
    description: description || "",
    budget: budgetMax || 5000,
    urgency: "rush",
  });

  const urgentProviders = providers
    .map((provider) => {
      const rating = provider.profile?.avgRating || 0;
      const etaMinutes = rating > 4.7 ? 15 : rating > 4.5 ? 20 : 30;
      return {
        providerId: provider.providerId,
        name: provider.user?.name || "Provider",
        rating,
        matchScore: provider.matchScore,
        responseTime: `${etaMinutes}m`,
        urgentBadge: rating >= 4.7,
        reason: provider.reason,
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (urgentProviders.length === 0) {
    return NextResponse.json({
      message: "No providers available for urgent service right now. Standard booking recommended.",
      providers: [],
      nextAction: "CONTINUE_CHAT",
    });
  }

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
});
