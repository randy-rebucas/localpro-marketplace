import { NextRequest } from "next/server";
import { withHandler, apiError, apiResponse } from "@/lib/utils";
import { requireUser, requireRole, requireCsrfToken } from "@/lib/auth";
import { assertObjectId } from "@/lib/errors";
import { jobRepository, quoteRepository, userRepository } from "@/repositories";
import { providerMatcherService } from "@/services/provider-matcher.service";
import { notificationService } from "@/services/notification.service";
import { pushStatusUpdateMany } from "@/lib/events";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Business Operations: Auto-Dispatch Handler
 *
 * Automatically assigns a job to the best matching provider based on:
 * - Skill match
 * - Rating & historical performance
 * - Availability & location
 * - Capacity constraints
 *
 * Used by operations team or admin for intelligent job assignment
 * when client hasn't received suitable quotes or needs expedited assignment.
 */

interface DispatchInput {
  jobId: string;
  providerId?: string; // If provided, assigns to specific provider. Otherwise, finds best match.
  proposedAmount?: number; // If not provided, uses job budget
}

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  // Only admins and designated operations team can dispatch jobs
  requireRole(user, "admin");
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`dispatch:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return apiError("Too many requests", 429);

  const body = await req.json();
  const { jobId, providerId, proposedAmount } = body as DispatchInput;

  if (!jobId) {
    return apiError("jobId is required", 400);
  }

  assertObjectId(jobId, "jobId");

  if (proposedAmount !== undefined) {
    if (typeof proposedAmount !== "number" || proposedAmount <= 0) {
      return apiError("proposedAmount must be a positive number", 400);
    }
  }

  // Fetch the job
  const job = await jobRepository.getDocById(jobId);
  if (!job) {
    return apiError("Job not found", 404);
  }

  const jobData = job as any;

  // Job must be in "open" status to be dispatched
  if (jobData.status !== "open") {
    return apiError(`Job status is "${jobData.status}". Only open jobs can be dispatched.`, 409);
  }

  // Validate amount
  const amount = proposedAmount ?? jobData.budget;
  if (!amount || amount <= 0) {
    return apiError("Invalid amount. Ensure job has budget or provide proposedAmount.", 400);
  }

  let assignedProviderId: string;
  let assignedProvider: any = null;

  if (providerId) {
    // Manual assignment: validate provider exists and is eligible
    assertObjectId(providerId, "providerId");

    const provider = await userRepository.findById(providerId);
    if (!provider) {
      return apiError("Provider not found", 404);
    }

    const providerData = provider as any;

    // approvalStatus is the field that tracks admin-approval state on User
    if (providerData.approvalStatus !== "approved") {
      return apiError(`Provider approval status is "${providerData.approvalStatus}". Cannot assign non-approved provider.`, 409);
    }

    assignedProviderId = providerId;
    assignedProvider = provider;
  } else {
    // Auto-match: find best candidate
    const candidates = await providerMatcherService.findProvidersForJob(jobData, 3);

    if (candidates.length === 0) {
      return apiError(
        "No suitable providers found for this job. Check category, ratings, and availability.",
        422
      );
    }

    // Select top candidate (highest match score)
    assignedProviderId = candidates[0].providerId;
  }

  // Atomic assignment
  const assignedJob = await jobRepository.atomicAssignProvider(
    jobId,
    assignedProviderId,
    amount
  );

  if (!assignedJob) {
    return apiError(
      "Job was already assigned or is no longer open. Please refresh and try again.",
      409
    );
  }

  // Post-assignment housekeeping
  try {
    // Bulk-reject all pending quotes for this job
    await quoteRepository.rejectAllPending(jobId);

    // Notify assigned provider
    await notificationService.push({
      userId: assignedProviderId,
      type: "agency_job_assigned",
      title: "Job Assigned",
      message: `You have been assigned a job: "${jobData.title}"`,
    }).catch((err: Error) => console.error("[Dispatch] Provider notification error:", err));

    // Notify client
    await notificationService.push({
      userId: jobData.clientId,
      type: "system_notice",
      title: "Provider Assigned",
      message: `A provider has been assigned to your job "${jobData.title}"`,
    }).catch((err: Error) => console.error("[Dispatch] Client notification error:", err));

    // Push real-time status update to both provider and client
    pushStatusUpdateMany(
      [assignedProviderId, jobData.clientId?.toString()].filter(Boolean) as string[],
      { entity: "job", id: jobId, status: "assigned" }
    );
  } catch (err) {
    console.error("[Dispatch] Post-assignment error:", err);
    // Don't fail the dispatch if housekeeping fails; assignment already happened
  }

  return apiResponse({
    success: true,
    job: assignedJob,
    assignedProviderId,
    message: `Job successfully dispatched to provider ${assignedProviderId}`,
  });
});

/**
 * GET /api/operations/dispatch
 * Health check / documentation endpoint
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  return apiResponse({
    endpoint: "/api/operations/dispatch",
    description: "Auto-assign jobs to matching providers",
    methods: {
      POST: {
        description: "Dispatch a job to best-matching provider or specific provider",
        body: {
          jobId: "string (required) - Job ObjectId",
          providerId: "string (optional) - Force assign to specific provider",
          proposedAmount: "number (optional) - Amount to assign (defaults to job.budget)",
        },
        responses: {
          200: "Job successfully assigned",
          400: "Invalid request (missing jobId, invalid ObjectId, zero amount)",
          404: "Job or provider not found",
          409: "Job not in open status, provider not approved",
          422: "No suitable providers found",
        },
      },
    },
  });
});
