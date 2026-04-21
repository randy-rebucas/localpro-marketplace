/**
 * Proactive Support Handler
 * Identifies at-risk jobs and sends preventive tips
 * POST /api/jobs/[id]/check-risk
 * 
 * Calls Proactive Support agent to:
 * - Identify job risk factors
 * - Generate prevention tips for both client and provider
 * - Notify parties if high risk
 */

import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { ValidationError, assertObjectId } from "@/lib/errors";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await connectDB();

  const { id: jobId } = await params;
  assertObjectId(jobId, "jobId");

  const body = await req.json().catch(() => ({}));

  // Extract job data
  const jobData = {
    title: body.jobTitle || "Job",
    budget: body.budget || 0,
    category: body.category || "general",
    urgency: body.urgency || "normal",
    complexity: body.complexity || "medium",
    location: body.location || "",
  };

  // Extract client profile
  const clientProfile = {
    isFirstTime: body.clientIsFirstTime || false,
    previousJobs: body.clientPreviousJobs || 0,
    totalSpent: body.clientTotalSpent || 0,
    rating: body.clientRating || 5,
    responseTime: body.clientResponseTime || "normal",
  };

  // Extract provider profile
  const providerProfile = {
    yearsExperience: body.providerYearsExperience || 0,
    jobsCompleted: body.providerJobsCompleted || 0,
    rating: body.providerRating || 4.5,
    completionRate: body.providerCompletionRate || 0.95,
    isNew: (body.providerJobsCompleted || 0) < 5,
  };

  // Extract risk factors
  const riskFactors = body.riskFactors || [];

  try {
    // Call Proactive Support AI agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(
      `${appUrl}/api/ai/agents/proactive-support`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
        body: JSON.stringify({
          jobId,
          jobData,
          clientProfile,
          providerProfile,
          riskFactors,
        }),
      }
    );

    if (!response.ok) {
      console.error("[Proactive Handler] AI agent failed:", response.status);
      throw new Error("Proactive support service failed");
    }

    const aiResult = await response.json();
    const assessment = aiResult.assessment;

    // TODO: In production, send notifications if risk is HIGH or MEDIUM
    // if (assessment.riskLevel === "high" || assessment.riskLevel === "medium") {
    //   await notificationService.sendProactiveTips(jobId, assessment);
    // }

    return NextResponse.json({
      success: true,
      jobId,
      riskAssessment: {
        riskLevel: assessment.riskLevel,
        score: assessment.riskScore,
        potentialIssues: assessment.potentialIssues,
      },
      preventiveTips: {
        client: assessment.preventiveTipsClient || [],
        provider: assessment.preventiveTipsProvider || [],
      },
      shouldNotify: assessment.shouldNotify,
      escalationScore: assessment.escalationScore,
    });
  } catch (error) {
    console.error("[Proactive Handler] Error:", error);
    throw new Error(`Risk assessment failed: ${String(error)}`);
  }
});
