import { jobRepository, activityRepository, providerProfileRepository } from "@/repositories";
import { calculateRiskScore } from "@/lib/riskScore";
import { rankJobsForProvider } from "@/lib/openai";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { PaginatedJobs } from "@/repositories/job.repository";

export interface CreateJobInput {
  title: string;
  category: string;
  description: string;
  budget: number;
  location: string;
  scheduleDate: string;
}

export interface JobFilters {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  /** When true and user is a provider, use AI to rank open jobs by relevance */
  aiRank?: boolean;
}

export class JobService {
  async listJobs(user: TokenPayload, filters: JobFilters): Promise<PaginatedJobs & { ranked?: boolean }> {
    const { status, category, page = 1, limit = 20, aiRank = false } = filters;
    const filter: Record<string, unknown> = {};

    if (user.role === "client") {
      filter.clientId = user.userId;
      if (status) filter.status = status;
    } else if (user.role === "provider") {
      if (status === "open" || !status) {
        filter.status = "open";
      } else {
        filter.providerId = user.userId;
        filter.status = status;
      }
    }

    if (category) filter.category = { $regex: category, $options: "i" };

    const result = await jobRepository.findPaginated(filter as never, {
      page: Math.max(1, page),
      limit: Math.min(50, limit),
    });

    // AI ranking: only for providers browsing the open marketplace
    if (aiRank && user.role === "provider" && (status === "open" || !status) && result.data.length > 1) {
      const profile = await providerProfileRepository.findByUserId(user.userId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rankedJobs = await rankJobsForProvider(result.data as any, profile);
      return { ...result, data: rankedJobs.map((r) => r.job) as typeof result.data, ranked: true };
    }

    return result;
  }

  async createJob(user: TokenPayload, input: CreateJobInput) {
    const jobData = {
      ...input,
      scheduleDate: new Date(input.scheduleDate),
      clientId: user.userId,
      status: "pending_validation" as const,
      escrowStatus: "not_funded" as const,
    };

    const riskScore = calculateRiskScore(jobData);
    const job = await jobRepository.create({ ...jobData, riskScore });

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_created",
      jobId: job._id!.toString(),
    });

    // Notify all admins about the new pending job
    const { notificationService } = await import("@/services/notification.service");
    await notificationService.notifyAdmins(
      "job_submitted",
      "New job pending review",
      `A new job "${input.title}" has been submitted and needs validation.`,
      { jobId: job._id!.toString() }
    );

    return job;
  }

  async getJob(user: TokenPayload, jobId: string) {
    const job = await jobRepository.findByIdPopulated(jobId);
    if (!job) throw new NotFoundError("Job");

    if (
      user.role === "client" &&
      (job as { clientId: { toString(): string } | string }).clientId.toString() !== user.userId
    ) {
      throw new ForbiddenError();
    }

    return job;
  }
}

export const jobService = new JobService();
