import { NextRequest } from "next/server";
import { withHandler, apiError, apiResponse } from "@/lib/utils";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { assertObjectId } from "@/lib/errors";
import { jobRepository } from "@/repositories";
import { providerMatcherService } from "@/services/provider-matcher.service";
import { checkRateLimit } from "@/lib/rateLimit";
import type { IJob } from "@/types";

/**
 * Business Operations: Provider Matching Handler
 *
 * Finds and ranks candidate providers for a job based on:
 * - Skill match
 * - Rating & performance history
 * - Availability & location
 * - Specializations & certifications
 *
 * Used by operations team to review candidate pool before making dispatch decisions.
 */

interface MatchingRequest {
  jobId: string;
  maxResults?: number; // Default: 5
}

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  // Only admins and operations team can access provider matching
  requireRole(user, "admin");
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`provider-matching:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return apiError("Too many requests", 429);

  const body = await req.json();
  const { jobId, maxResults = 5 } = body as MatchingRequest;

  if (!jobId) {
    return apiError("jobId is required", 400);
  }

  assertObjectId(jobId, "jobId");

  if (typeof maxResults !== "number" || maxResults < 1 || maxResults > 20) {
    return apiError("maxResults must be a number between 1 and 20", 400);
  }

  // Fetch the job
  const job = await jobRepository.getDocById(jobId);
  if (!job) {
    return apiError("Job not found", 404);
  }

  // Find matching providers
  const candidates = await providerMatcherService.findProvidersForJob(
    job as Partial<IJob>,
    maxResults
  );

  // Enrich candidate data
  const enriched = candidates.map((candidate) => ({
    ...candidate,
    profileLink: `/api/providers/${candidate.providerId}/profile`,
    actionLink: `/api/operations/dispatch`,
  }));

  return apiResponse({
    jobId,
    jobTitle: (job as any).title,
    jobCategory: (job as any).category,
    totalCandidates: enriched.length,
    candidates: enriched,
    matchingStrategy: "Score-based ranking: rating × completedJobs × certification × urgency",
  });
});

/**
 * GET /api/operations/provider-matching
 * Health check / documentation endpoint
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  return apiResponse({
    endpoint: "/api/operations/provider-matching",
    description: "Find candidate providers for a job",
    methods: {
      POST: {
        description: "Search for providers matching job criteria with quality scoring",
        body: {
          jobId: "string (required) - Job ObjectId to find matches for",
          maxResults: "number (optional, default 5) - Max candidates to return (1-20)",
        },
        responses: {
          200: "Array of candidate providers ranked by match score",
          400: "Invalid jobId or maxResults",
          404: "Job not found",
        },
      },
    },
  });
});
