import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { searchProvidersForJob } from "@/lib/chat-dispatcher";
import { checkRateLimit } from "@/lib/rateLimit";
import { ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:recurring-job:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const {
    jobData: { category, description, location, frequency, budgetMin, budgetMax } = {} as any,
  } = body;

  if (!category || !frequency || !location) {
    throw new ValidationError("Missing required fields for recurring service");
  }

  const providers = await searchProvidersForJob({
    title: `Recurring ${category} service`,
    category,
    location,
    description: description || "",
    budget: budgetMax || 5000,
  });

  const recurringProviders = providers
    .map((provider) => ({
      providerId: provider.providerId,
      name: provider.user?.name || "Provider",
      rating: provider.profile?.avgRating || 0,
      matchScore: provider.matchScore || 0,
      reason: provider.reason,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  if (recurringProviders.length === 0) {
    return NextResponse.json({
      message: "No providers currently available for recurring service",
      providers: [],
    });
  }

  return NextResponse.json({
    message: `Found ${recurringProviders.length} providers who offer ${frequency} ${category} services`,
    providers: recurringProviders,
    frequency,
    category,
    budgetRange: { min: budgetMin, max: budgetMax },
    nextAction: "SELECT_RECURRING_PROVIDER",
  });
});
