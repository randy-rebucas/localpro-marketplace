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
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, assertObjectId } from "@/lib/errors";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  await connectDB();

  const { id: jobId } = await params;
  assertObjectId(jobId, "jobId");

  // TODO: Fetch job from database
  // const job = await jobRepository.getDocById(jobId);
  // if (!job) throw new NotFoundError("Job");

  // For now, accept job data from request
  const body = await req.json().catch(() => ({}));
  const { availableProviders = [] } = body;

  if (!Array.isArray(availableProviders) || availableProviders.length === 0) {
    throw new ValidationError(
      "availableProviders array is required with at least one provider"
    );
  }

  try {
    // Call Booking Optimizer AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/booking-optimizer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
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
      throw new Error("Provider matching service failed");
    }

    const aiResult = await response.json();
    const matchResults = aiResult.matches;

    // Return ranked providers
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
      allMatches: matchResults, // Include all for admin view if needed
    });
  } catch (error) {
    console.error("[Matching Handler] Error:", error);
    throw new Error(`Provider matching failed: ${String(error)}`);
  }
});
