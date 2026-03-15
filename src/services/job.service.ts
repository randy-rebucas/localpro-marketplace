import { jobRepository, activityRepository, providerProfileRepository } from "@/repositories";
import { assessJobRisk } from "@/lib/riskScore";
import { rankJobsForProvider } from "@/lib/openai";
import { NotFoundError, ForbiddenError, UnprocessableError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { PaginatedJobs } from "@/repositories/job.repository";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getAppSetting } from "@/lib/appSettings";
import { type UrgencyLevel } from "@/lib/commission";
import type { JobTag } from "@/types";

// ─── Shared base ─────────────────────────────────────────────────────────────

/** Fields every job must have regardless of who posted it. */
export interface BaseJobInput {
  category: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  scheduleDate: string | Date;
  specialInstructions?: string;
}

/**
 * Builds the minimal DB payload shared by all job types.
 * Services extend this with their own source-specific fields.
 */
export function buildCoreJobPayload(input: BaseJobInput, posterId: string) {
  return {
    clientId:            posterId,
    category:            input.category,
    title:               input.title,
    description:         input.description,
    budget:              input.budget,
    location:            input.location,
    scheduleDate:        new Date(input.scheduleDate),
    specialInstructions: input.specialInstructions ?? "",
    escrowStatus:        "not_funded" as const,
    riskScore:           0,
    fraudFlags:          [] as string[],
  };
}

// ─── Client job ───────────────────────────────────────────────────────────────

export interface CreateJobInput extends BaseJobInput {
  beforePhoto?: string[];
  coordinates?: { type: "Point"; coordinates: [number, number] };
  invitedProviderId?: string;
  urgency?: UrgencyLevel;
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

    if (category) {
      const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.category = { $regex: escaped, $options: "i" };
    }

    // Priority jobs float to top when providers browse the open marketplace
    const priorityFirst = user.role === "provider" && (status === "open" || !status);

    const result = await jobRepository.findPaginated(filter as never, {
      page: Math.max(1, page),
      limit: Math.min(50, limit),
      priorityFirst,
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
    // ── Platform-wide settings enforcement ─────────────────────────────────
    const [kycRequired, maxActive] = await Promise.all([
      getAppSetting("platform.kycRequired", false),
      getAppSetting("limits.maxActiveJobsPerClient", 10),
    ]);

    if (kycRequired) {
      const kycDoc = await User.findById(user.userId).select("kycStatus").lean() as { kycStatus?: string } | null;
      if (kycDoc?.kycStatus !== "approved") {
        throw new UnprocessableError("Identity verification (KYC) is required to post jobs");
      }
    }

    const activeCount = await jobRepository.countActiveForClient(user.userId);
    if (activeCount >= (maxActive as number)) {
      throw new UnprocessableError(`You cannot have more than ${maxActive} active jobs at once`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await jobRepository.countByClientSince(user.userId, today);
    if (todayCount >= 10) {
      throw new UnprocessableError("Daily job posting limit reached (10 per day)");
    }

    const { invitedProviderId, urgency: urgencyInput, ...rest } = input;
    const urgencyLevel: UrgencyLevel = urgencyInput ?? "standard";

    // Fetch urgency fee amounts from AppSettings (locked-in at job creation time)
    const [urgencyFeeSameDay, urgencyFeeRush] = await Promise.all([
      getAppSetting("payments.urgencyFeeSameDay", 50) as Promise<number>,
      getAppSetting("payments.urgencyFeeRush",    100) as Promise<number>,
    ]);
    const urgencyFee =
      urgencyLevel === "same_day" ? (urgencyFeeSameDay as number)
      : urgencyLevel === "rush"   ? (urgencyFeeRush    as number)
      : 0;

    // Build from shared core then layer private-job specifics
    const coreData = buildCoreJobPayload(rest, user.userId);
    const jobData = {
      ...coreData,
      status:    "pending_validation" as const,
      jobSource: "private"  as const,
      urgency:    urgencyLevel,
      urgencyFee,
      ...(input.beforePhoto   ? { beforePhoto:   input.beforePhoto }   : {}),
      ...(input.coordinates   ? { coordinates:   input.coordinates }   : {}),
      ...(invitedProviderId   ? { invitedProviderId }                   : {}),
    };

    // ── Fraud & risk assessment ─────────────────────────────────────────────
    await connectDB();
    const [sevenDayCount, rejectedCount, clientDoc, fraudBlockScore, fraudHighBudget] = await Promise.all([
      jobRepository.countByClientSince(
        user.userId,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ),
      jobRepository.countRejectedByClient(user.userId),
      User.findById(user.userId)
        .select("isVerified kycStatus flaggedJobCount createdAt")
        .lean() as Promise<{
          isVerified?: boolean;
          kycStatus?: string;
          flaggedJobCount?: number;
          createdAt?: Date;
        } | null>,
      getAppSetting<number>("fraud.jobBlockScore", 80),
      getAppSetting<number>("fraud.highBudgetThreshold", 5000),
    ]);

    const accountAgeDays = clientDoc?.createdAt
      ? (Date.now() - new Date(clientDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const { score: riskScore, fraudFlags } = assessJobRisk(jobData, {
      jobsLast24h: todayCount,
      jobsLast7Days: sevenDayCount,
      rejectedJobCount: rejectedCount,
      flaggedJobCount: clientDoc?.flaggedJobCount ?? 0,
      isVerified: clientDoc?.isVerified ?? false,
      kycApproved: clientDoc?.kycStatus === "approved",
      accountAgeDays,
    }, { highBudgetThreshold: fraudHighBudget as number });

    // Block posting if risk score meets or exceeds the block threshold
    if (riskScore >= (fraudBlockScore as number)) {
      throw new UnprocessableError(
        "Your job posting was blocked due to a high fraud risk score. Please review your job details or contact support."
      );
    }

    const job = await jobRepository.create({ ...jobData, riskScore, fraudFlags });

    // Increment user's flaggedJobCount when fraud signals are present
    if (fraudFlags.length > 0) {
      await User.findByIdAndUpdate(user.userId, {
        $inc: { flaggedJobCount: 1 },
        $addToSet: { fraudFlags: { $each: fraudFlags.slice(0, 3) } },
      });
    }

    await activityRepository.log({
      userId: user.userId,
      eventType: "job_created",
      jobId: job._id!.toString(),
      ...(invitedProviderId ? { metadata: { invitedProviderId } } : {}),
    });

    // Notify all admins about the new pending job
    const { notificationService } = await import("@/services/notification.service");
    const directNote = invitedProviderId ? " (direct invite to a specific provider)" : "";
    const fraudNote = fraudFlags.length > 0 ? ` ⚠️ Fraud flags detected.` : "";
    await notificationService.notifyAdmins(
      "job_submitted",
      "New job pending review",
      `A new job "${input.title}" has been submitted and needs validation${directNote}.${fraudNote}`,
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

    // H12: Providers may only view jobs they are assigned to, or jobs that are open/public
    if (user.role === "provider") {
      const j = job as {
        status: string;
        providerId?: { toString(): string } | string | null;
        invitedProviderId?: { toString(): string } | string | null;
      };
      const isAssigned = j.providerId?.toString() === user.userId;
      const isInvited = j.invitedProviderId?.toString() === user.userId;
      const isPublic = ["open", "pending_validation"].includes(j.status);
      if (!isAssigned && !isInvited && !isPublic) {
        throw new ForbiddenError();
      }
    }

    return job;
  }
}

export const jobService = new JobService();
