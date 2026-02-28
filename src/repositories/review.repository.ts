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

  async existsForJob(jobId: string): Promise<boolean> {
    return this.exists({ jobId } as never);
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
}

export const reviewRepository = new ReviewRepository();
