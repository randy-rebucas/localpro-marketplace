import ProviderProfile from "@/models/ProviderProfile";
import type { ProviderProfileDocument } from "@/models/ProviderProfile";
import { UpdateQuery } from "mongoose";
import { BaseRepository } from "./base.repository";

export class ProviderProfileRepository extends BaseRepository<ProviderProfileDocument> {
  constructor() {
    super(ProviderProfile);
  }

  async findByUserId(userId: string): Promise<ProviderProfileDocument | null> {
    return this.findOne({ userId } as never);
  }

  async findByUserIdPopulated(userId: string): Promise<ProviderProfileDocument | null> {
    await this.connect();
    return ProviderProfile.findOne({ userId })
      .populate("userId", "name email isVerified")
      .lean() as unknown as ProviderProfileDocument | null;
  }

  async upsert(
    userId: string,
    data: Partial<ProviderProfileDocument>
  ): Promise<ProviderProfileDocument> {
    await this.connect();
    const doc = await ProviderProfile.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true }
    ).lean();
    return doc as unknown as ProviderProfileDocument;
  }

  /** Recompute stats after a review is submitted. */
  async recalculateStats(
    userId: string,
    avgRating: number,
    completedJobCount: number
  ): Promise<void> {
    await ProviderProfile.updateOne(
      { userId },
      { $set: { avgRating, completedJobCount } }
    );
  }

  /** Batch fetch rating/completedJobCount for a list of provider user IDs. */
  async findStatsByUserIds(
    userIds: string[]
  ): Promise<{ userId: { toString(): string }; avgRating?: number; completedJobCount?: number }[]> {
    await this.connect();
    return ProviderProfile.find({ userId: { $in: userIds } })
      .select("userId avgRating completedJobCount")
      .lean() as never;
  }
}

export const providerProfileRepository = new ProviderProfileRepository();
