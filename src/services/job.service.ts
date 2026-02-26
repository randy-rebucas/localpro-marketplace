import { jobRepository } from "@/repositories";
import { activityRepository } from "@/repositories";
import { calculateRiskScore } from "@/lib/riskScore";
import {
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
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
}

export class JobService {
  async listJobs(user: TokenPayload, filters: JobFilters): Promise<PaginatedJobs> {
    const { status, category, page = 1, limit = 20 } = filters;
    const filter: Record<string, unknown> = {};

    if (user.role === "client") {
      filter.clientId = user.userId;
      if (status) filter.status = status;
    } else if (user.role === "provider") {
      if (status === "open") {
        filter.status = "open";
      } else {
        filter.providerId = user.userId;
        if (status) filter.status = status;
      }
    }
    // admin: no default filter, sees everything

    if (category) filter.category = { $regex: category, $options: "i" };

    return jobRepository.findPaginated(filter as never, {
      page: Math.max(1, page),
      limit: Math.min(50, limit),
    });
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

    return job;
  }

  async getJob(user: TokenPayload, jobId: string) {
    const job = await jobRepository.findByIdPopulated(jobId);
    if (!job) throw new NotFoundError("Job");

    // Clients may only see their own jobs
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
