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
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const { id: jobId } = await params;
  assertObjectId(jobId, "jobId");

  const rl = await checkRateLimit(`check-risk:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Risk assessment service not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));

  const jobData = {
    title: body.jobTitle || "Job",
    budget: body.budget || 0,
    category: body.category || "general",
    urgency: body.urgency || "normal",
    complexity: body.complexity || "medium",
    location: body.location || "",
  };

  const clientProfile = {
    isFirstTime: body.clientIsFirstTime || false,
    previousJobs: body.clientPreviousJobs || 0,
    totalSpent: body.clientTotalSpent || 0,
    rating: body.clientRating || 5,
    responseTime: body.clientResponseTime || "normal",
  };

  const providerProfile = {
    yearsExperience: body.providerYearsExperience || 0,
    jobsCompleted: body.providerJobsCompleted || 0,
    rating: body.providerRating || 4.5,
    completionRate: body.providerCompletionRate || 0.95,
    isNew: (body.providerJobsCompleted || 0) < 5,
  };

  const riskFactors = body.riskFactors || [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${appUrl}/api/ai/agents/proactive-support`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${internalKey}`,
    },
    body: JSON.stringify({
      jobId,
      jobData,
      clientProfile,
      providerProfile,
      riskFactors,
    }),
  });

  if (!response.ok) {
    console.error("[Proactive Handler] AI agent failed:", response.status);
    return NextResponse.json({ error: "Proactive support service failed" }, { status: 502 });
  }

  const aiResult = await response.json();
  const assessment = aiResult.assessment;

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
});
