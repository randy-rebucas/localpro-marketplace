import ProviderProfile from "@/models/ProviderProfile";
import type { ProviderProfileDocument } from "@/models/ProviderProfile";
import { UpdateQuery } from "mongoose";
import { BaseRepository } from "./base.repository";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";

export class ProviderProfileRepository extends BaseRepository<ProviderProfileDocument> {
  constructor() {
    super(ProviderProfile);
  }

  async findByUserId(userId: string): Promise<ProviderProfileDocument | null> {
    return this.findOne({ userId } as never);
  }

  async findByUserIdPopulated(userId: string): Promise<ProviderProfileDocument | null> {
    const cacheKey = `cache:provider:${userId}`;
    const cached = await cacheGet<ProviderProfileDocument>(cacheKey);
    if (cached) return cached;

    await this.connect();
    const result = await ProviderProfile.findOne({ userId })
      .populate("userId", "name email isVerified avatar kycStatus")
      .lean() as unknown as ProviderProfileDocument | null;

    if (result) {
      await cacheSet(cacheKey, result, 3600); // 1 hour
    }
    return result;
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

    // Invalidate cached profile so next read picks up changes
    await cacheInvalidate(`cache:provider:${userId}`);

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

  /** Update completion stats after escrow release. */
  async updateCompletionStats(
    userId: string,
    completedJobCount: number,
    completionRate: number
  ): Promise<void> {
    await this.connect();
    await ProviderProfile.updateOne(
      { userId },
      { $set: { completedJobCount, completionRate } }
    );
  }

  /** Batch fetch enriched profile fields for a list of provider user IDs (used by favorites list). */
  async findByUserIds(
    userIds: string[]
  ): Promise<ProviderProfileDocument[]> {
    await this.connect();
    return ProviderProfile.find({ userId: { $in: userIds } })
      .select("userId bio skills yearsExperience hourlyRate avgRating completedJobCount availabilityStatus avgResponseTimeHours completionRate isLocalProCertified")
      .lean() as unknown as ProviderProfileDocument[];
  }

  /** Batch fetch rating/completedJobCount/isLocalProCertified for a list of provider user IDs. */
  async findStatsByUserIds(
    userIds: string[]
  ): Promise<{ userId: { toString(): string }; avgRating?: number; completedJobCount?: number; isLocalProCertified?: boolean }[]> {
    await this.connect();
    return ProviderProfile.find({ userId: { $in: userIds } })
      .select("userId avgRating completedJobCount isLocalProCertified")
      .lean() as never;
  }

  /** Grant or revoke the LocalPro Certified badge for a provider. */
  async setCertification(userId: string, value: boolean): Promise<void> {
    await this.connect();
    await ProviderProfile.updateOne({ userId }, { $set: { isLocalProCertified: value } });
  }

  /** Return a map of userId → isLocalProCertified for the given user IDs. */
  async findCertificationByUserIds(
    userIds: string[]
  ): Promise<Map<string, boolean>> {
    await this.connect();
    const docs = await ProviderProfile.find({ userId: { $in: userIds } })
      .select("userId isLocalProCertified")
      .lean() as Array<{ userId: { toString(): string }; isLocalProCertified?: boolean }>;
    return new Map(docs.map((d) => [d.userId.toString(), d.isLocalProCertified ?? false]));
  }

  /**
   * Reset availabilityStatus to "available" for any provider currently marked
   * "busy" whose userId is NOT in the `activeProviderIds` set (i.e. they have
   * no active assigned / in_progress jobs right now).
   * Returns the number of profiles updated.
   */
  async resetBusyExcluding(activeProviderIds: string[]): Promise<number> {
    await this.connect();
    const result = await ProviderProfile.updateMany(
      {
        availabilityStatus: "busy",
        userId: { $nin: activeProviderIds },
      },
      { $set: { availabilityStatus: "available" } }
    );
    return result.modifiedCount ?? 0;
  }

  /** Batch fetch export fields (skills, workExperiences, yearsExperience, availabilityStatus) for the user CSV export and admin list. */
  async findForExport(
    userIds: string[]
  ): Promise<Array<{ userId: { toString(): string }; skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>; workExperiences: string[]; yearsExperience: number; availabilityStatus: string }>> {
    await this.connect();
    return ProviderProfile.find({ userId: { $in: userIds } })
      .select("userId skills workExperiences yearsExperience availabilityStatus")
      .lean() as never;
  }

  /** Return every distinct skill string across all provider profiles, sorted A→Z. */
  async findDistinctSkills(): Promise<string[]> {
    await this.connect();
    const skills = await ProviderProfile.distinct("skills.skill");
    return (skills as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Return the userId strings of providers whose profile matches ALL supplied filters.
   * Any filter left undefined / 0 / false is ignored.
   */
  async findUserIdsByFilters(filters: {
    skill?: string;
    minRating?: number;
    minJobs?: number;
    availability?: string;
    certified?: boolean;
  }): Promise<string[]> {
    await this.connect();
    const q: Record<string, unknown> = {};
    if (filters.skill)                  q["skills.skill"]   = filters.skill;
    if ((filters.minRating ?? 0) > 0)   q.avgRating          = { $gte: filters.minRating };
    if ((filters.minJobs   ?? 0) > 0)   q.completedJobCount  = { $gte: filters.minJobs };
    if (filters.availability)           q.availabilityStatus = filters.availability;
    if (filters.certified === true)     q.isLocalProCertified = true;
    const docs = await ProviderProfile.find(q)
      .select("userId")
      .lean() as Array<{ userId: { toString(): string } }>;
    return docs.map((d) => d.userId.toString());
  }
}

export const providerProfileRepository = new ProviderProfileRepository();
