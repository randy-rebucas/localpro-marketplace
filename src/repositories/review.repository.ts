import Review from "@/models/Review";
import type { ReviewDocument } from "@/models/Review";
import { FilterQuery, Types } from "mongoose";
import { BaseRepository } from "./base.repository";

export class ReviewRepository extends BaseRepository<ReviewDocument> {
  constructor() {
    super(Review);
  }

  async findWithPopulation(
    filter: FilterQuery<ReviewDocument>
  ): Promise<ReviewDocument[]> {
    await this.connect();
    return Review.find(filter)
      .populate("jobId", "title")
      .populate("clientId", "name")
      .populate("providerId", "name")
      .sort({ createdAt: -1 })
      .lean() as unknown as ReviewDocument[];
  }

  async existsForJob(jobId: string, clientId?: string): Promise<boolean> {
    await this.connect();
    const filter: FilterQuery<ReviewDocument> = { jobId: new Types.ObjectId(jobId) };
    if (clientId) filter.clientId = new Types.ObjectId(clientId);
    return this.exists(filter);
  }

  /** Aggregated avg rating + review count for a provider. Single DB round-trip. */
  async getProviderRatingSummary(providerId: string): Promise<{ avgRating: number; count: number }> {
    await this.connect();
    const [result] = await Review.aggregate<{ avgRating: number; count: number }>([
      { $match: { providerId: new Types.ObjectId(providerId) } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    return result ?? { avgRating: 0, count: 0 };
  }

  /** Per-category avg ratings for a provider (only reviews with breakdown). */
  async getProviderBreakdownSummary(providerId: string): Promise<{
    quality: number; professionalism: number; punctuality: number; communication: number; count: number;
  } | null> {
    await this.connect();
    const [result] = await Review.aggregate<{
      quality: number; professionalism: number; punctuality: number; communication: number; count: number;
    }>([
      { $match: { providerId: new Types.ObjectId(providerId), "breakdown.quality": { $exists: true } } },
      {
        $group: {
          _id: null,
          quality:         { $avg: "$breakdown.quality" },
          professionalism: { $avg: "$breakdown.professionalism" },
          punctuality:     { $avg: "$breakdown.punctuality" },
          communication:   { $avg: "$breakdown.communication" },
          count:           { $sum: 1 },
        },
      },
    ]);
    return result ?? null;
  }

  /** Count of consecutive 5-star reviews from the latest. */
  async getFiveStarStreak(providerId: string): Promise<number> {
    await this.connect();
    const recent = await Review.find({ providerId: new Types.ObjectId(providerId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("rating")
      .lean() as { rating: number }[];
    let streak = 0;
    for (const r of recent) {
      if (r.rating === 5) streak++;
      else break;
    }
    return streak;
  }
}

export const reviewRepository = new ReviewRepository();
