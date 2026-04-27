import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { jobRepository } from "@/repositories";
import { searchProvidersForJob } from "@/lib/chat-dispatcher";
import { enqueueNotification } from "@/lib/notification-queue";
import { checkRateLimit } from "@/lib/rateLimit";
import { assertObjectId, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:switch-provider:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { jobId, reason, feedback } = body;

  if (!jobId) throw new ValidationError("No active job to switch provider from");
  assertObjectId(jobId, "jobId");

  const job = await jobRepository.findById(jobId) as any;
  if (!job) throw new NotFoundError("Job not found");

  if (job.clientId.toString() !== user.userId) {
    throw new ForbiddenError("You do not have permission to modify this job");
  }

  const switchableStatuses = ["assigned", "in_progress"];
  if (!switchableStatuses.includes(job.status)) {
    throw new ValidationError(`Cannot switch provider - job status is: ${job.status}`);
  }

  const currentProviderId = job.providerId;

  const replacementProviders = await searchProvidersForJob({
    title: `Replacement ${job.category} provider`,
    category: job.category,
    location: job.location,
    description: job.description,
    budget: job.budget || 5000,
  });

  const replacementOptions = replacementProviders
    .slice(0, 3)
    .map((provider) => ({
      providerId: provider.providerId,
      name: provider.user?.name || "Provider",
      rating: provider.profile?.avgRating || 0,
      matchScore: provider.matchScore || 0,
      reason: provider.reason,
    }));

  if (currentProviderId) {
    await enqueueNotification({
      userId: currentProviderId.toString(),
      channel: "push",
      category: "PROVIDER_SWITCH",
      subject: "Provider Switch Requested",
      body: "A client has requested to switch providers for their job.",
      immediate: true,
    });
  }

  return NextResponse.json({
    message: `I found ${replacementOptions.length} alternative providers who are a great fit. You can switch anytime, and we'll notify your current provider.\n\n**Note:** If payment was made, we'll credit it to your new provider or refund based on time spent.`,
    replacementProviders: replacementOptions,
    switchRequested: true,
    nextAction: "SELECT_REPLACEMENT_PROVIDER",
  });
});
