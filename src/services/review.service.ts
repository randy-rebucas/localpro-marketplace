import {
  reviewRepository,
  jobRepository,
  activityRepository,
  notificationRepository,
} from "@/repositories";
import { pushNotification } from "@/lib/events";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export interface CreateReviewInput {
  jobId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string;
}

export interface ReviewFilters {
  providerId?: string;
}

export class ReviewService {
  async listReviews(user: TokenPayload, filters: ReviewFilters) {
    const filter: Record<string, string> = {};
    if (user.role === "client") filter.clientId = user.userId;
    else if (user.role === "provider") filter.providerId = user.userId;
    else if (filters.providerId) filter.providerId = filters.providerId;
    return reviewRepository.findWithPopulation(filter as never);
  }

  async submitReview(user: TokenPayload, input: CreateReviewInput) {
    const job = await jobRepository.findById(input.jobId);
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as IJob;
    if (j.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (j.status !== "completed") throw new UnprocessableError("Can only review completed jobs");
    if (j.escrowStatus !== "released") {
      throw new UnprocessableError("Escrow must be released before reviewing");
    }
    if (!j.providerId) throw new UnprocessableError("No provider assigned to this job");

    const existing = await reviewRepository.existsForJob(input.jobId);
    if (existing) throw new ConflictError("You have already reviewed this job");

    const review = await reviewRepository.create({
      ...input,
      clientId: user.userId,
      providerId: j.providerId,
    });

    await activityRepository.log({
      userId: user.userId,
      eventType: "review_submitted",
      jobId: input.jobId,
      metadata: { rating: input.rating },
    });

    // Recompute provider stats
    const { providerProfileService } = await import("@/services/providerProfile.service");
    await providerProfileService.recalculateStats(j.providerId.toString());

    // Notify provider
    const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
    const notification = await notificationRepository.create({
      userId: j.providerId.toString(),
      type: "review_received",
      title: "New review received",
      message: `${stars} — "${input.feedback.slice(0, 60)}${input.feedback.length > 60 ? "…" : ""}"`,
      data: { jobId: input.jobId },
    });
    pushNotification(j.providerId.toString(), notification);

    return review;
  }
}

export const reviewService = new ReviewService();
