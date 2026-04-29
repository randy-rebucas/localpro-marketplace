/**
 * Provider Matching Handler
 * Intelligently matches available providers to jobs
 * POST /api/jobs/[id]/match-providers
 *
 * Calls Booking Optimizer to:
 * - Rank providers by skill match, rating, availability
 * - Generate match scores
 * - Recommend top 3 providers for client selection
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const { id: jobId } = await params;
  assertObjectId(jobId, "jobId");

  const rl = await checkRateLimit(`match-providers:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Provider matching service not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { availableProviders = [] } = body;

  if (!Array.isArray(availableProviders) || availableProviders.length === 0) {
    throw new ValidationError(
      "availableProviders array is required with at least one provider"
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${appUrl}/api/ai/agents/booking-optimizer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${internalKey}`,
    },
    body: JSON.stringify({
      job: {
        id: jobId,
        title: body.jobTitle || "Service Request",
        budget: body.budget || 0,
        skills: body.requiredSkills || [],
        location: body.location || "",
        urgency: body.urgency || "normal",
        category: body.category || "",
      },
      availableProviders: availableProviders.map((p: any) => ({
        id: p._id || p.id,
        name: p.name,
        rating: p.rating || 4.5,
        totalJobs: p.jobsCompleted || 0,
        skills: p.skills || [],
        distance: p.distance || 0,
        responseTime: p.avgResponseTime || 2,
        availability: p.isAvailable !== false,
        hourlyRate: p.hourlyRate || 0,
        completionRate: p.completionRate || 0.95,
      })),
    }),
  });

  if (!response.ok) {
    console.error("[Matching Handler] AI agent failed:", response.status);
    return NextResponse.json({ error: "Provider matching service failed" }, { status: 502 });
  }

  const aiResult = await response.json();
  const matchResults = aiResult.matches;

  return NextResponse.json({
    success: true,
    jobId,
    totalMatches: matchResults.length,
    topMatches: matchResults.slice(0, 3).map((m: any) => ({
      providerId: m.providerId,
      matchScore: m.matchScore,
      recommendedQuote: m.recommendedQuote,
      matchReasons: m.reasons,
      estimatedResponseTime: m.estimatedAcceptanceTime,
    })),
    allMatches: matchResults,
  });
});
