import Review from "@/models/Review";
import type { ReviewDocument } from "@/models/Review";
import { FilterQuery } from "mongoose";
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
}

export const reviewRepository = new ReviewRepository();
