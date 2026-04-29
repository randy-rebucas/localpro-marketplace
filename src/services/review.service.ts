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
  assertObjectId,
} from "@/lib/errors";
import { requireCapability } from "@/lib/auth";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export interface CreateReviewInput {
  jobId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string;
  breakdown?: {
    quality: 1 | 2 | 3 | 4 | 5;
    professionalism: 1 | 2 | 3 | 4 | 5;
    punctuality: 1 | 2 | 3 | 4 | 5;
    communication: 1 | 2 | 3 | 4 | 5;
  };
}

export interface ReviewFilters {
  providerId?: string;
}

export class ReviewService {
  async listReviews(user: TokenPayload, filters: ReviewFilters) {
    const filter: Record<string, unknown> = {};
    if (user.role === "client") filter.clientId = user.userId;
    else if (user.role === "provider") filter.providerId = user.userId;
    else if (filters.providerId) filter.providerId = filters.providerId;

    // Exclude hidden reviews from public display (admins/staff see all)
    if (user.role !== "admin" && !user.capabilities?.includes("manage_disputes")) {
      filter.isHidden = { $ne: true };
    }

    return reviewRepository.findWithPopulation(filter as never);
  }

  async submitReview(user: TokenPayload, input: CreateReviewInput) {
    assertObjectId(input.jobId, "jobId");
    const job = await jobRepository.findById(input.jobId);
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as IJob;
    if (j.clientId.toString() !== user.userId) throw new ForbiddenError();
    if (j.status !== "completed") throw new UnprocessableError("Can only review completed jobs");
    if (j.escrowStatus !== "released") {
      throw new UnprocessableError("Escrow must be released before reviewing");
    }
    if (!j.providerId) throw new UnprocessableError("No provider assigned to this job");

    const existing = await reviewRepository.existsForJob(input.jobId, user.userId);
    if (existing) throw new ConflictError("You have already reviewed this job");

    let review;
    try {
      review = await reviewRepository.create({
        jobId:       input.jobId,
        rating:      input.rating,
        feedback:    input.feedback,
        breakdown:   input.breakdown,
        clientId:    user.userId,
        providerId:  j.providerId,
      });
    } catch (err: unknown) {
      // Mongo E11000 — compound unique (jobId + clientId) violated
      if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
        throw new ConflictError("You have already reviewed this job");
      }
      throw err;
    }

    await activityRepository.log({
      userId: user.userId,
      eventType: "review_submitted",
      jobId: input.jobId,
      metadata: { rating: input.rating },
    });

    // Recompute provider stats
    const { providerProfileService } = await import("@/services/providerProfile.service");
    await providerProfileService.recalculateStats(j.providerId.toString());

    // Award loyalty points for leaving a review
    try {
      const { loyaltyService } = await import("@/services/loyalty.service");
      await loyaltyService.awardReviewPoints(user.userId, input.jobId);
    } catch {
      // Non-critical
    }

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
  async respondToReview(user: TokenPayload, reviewId: string, response: string) {
    assertObjectId(reviewId, "reviewId");
    const review = await reviewRepository.getDocById(reviewId);
    if (!review) throw new NotFoundError("Review");

    const r = review as unknown as {
      _id: { toString(): string };
      providerId: { toString(): string };
      clientId: { toString(): string };
      providerResponse?: string | null;
      jobId: { toString(): string };
      save(): Promise<unknown>;
    };

    // Only the reviewed provider can respond
    if (r.providerId.toString() !== user.userId) throw new ForbiddenError();

    // One response per review — cannot edit once submitted
    if (r.providerResponse) {
      throw new ConflictError("You have already responded to this review");
    }

    // Use atomic update to guard against concurrent writes
    const updated = await reviewRepository.atomicSetResponse(r._id.toString(), response);
    if (!updated) throw new ConflictError("Response was already submitted");

    await activityRepository.log({
      userId: user.userId,
      eventType: "review_responded",
      jobId: r.jobId.toString(),
      metadata: { reviewId: r._id.toString() },
    });

    // Notify the client
    const notification = await notificationRepository.create({
      userId: r.clientId.toString(),
      type: "review_response" as never,
      title: "Provider responded to your review",
      message: `The provider replied to your review: "${response.slice(0, 80)}${response.length > 80 ? "..." : ""}"`,
      data: { reviewId: r._id.toString(), jobId: r.jobId.toString() },
    });
    pushNotification(r.clientId.toString(), notification);

    return updated;
  }

  async moderateReview(
    user: TokenPayload,
    reviewId: string,
    action: { hide: boolean; reason?: string }
  ) {
    // Admin only — requires manage_disputes or manage_users capability
    requireCapability(user, "manage_disputes");
    assertObjectId(reviewId, "reviewId");

    const review = await reviewRepository.getDocById(reviewId);
    if (!review) throw new NotFoundError("Review");

    const r = review as unknown as {
      _id: { toString(): string };
      jobId: { toString(): string };
    };

    const moderationUpdates = {
      isHidden:     action.hide,
      hiddenReason: action.hide ? (action.reason ?? null) : null,
      hiddenBy:     action.hide ? user.userId : null,
    };

    const updated = await reviewRepository.moderateById(r._id.toString(), moderationUpdates);

    await activityRepository.log({
      userId: user.userId,
      eventType: action.hide ? "review_hidden" : "review_unhidden",
      jobId: r.jobId.toString(),
      metadata: { reviewId: r._id.toString(), reason: action.reason },
    });

    return updated;
  }
}

export const reviewService = new ReviewService();
