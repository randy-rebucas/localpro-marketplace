import Quote from "@/models/Quote";
import type { QuoteDocument } from "@/models/Quote";
import { Types } from "mongoose";
import { BaseRepository } from "./base.repository";

export class QuoteRepository extends BaseRepository<QuoteDocument> {
  constructor() {
    super(Quote);
  }

  async findForJob(jobId: string): Promise<QuoteDocument[]> {
    await this.connect();
    return Quote.find({ jobId })
      .populate("providerId", "name email")
      .sort({ createdAt: -1 })
      .lean() as unknown as QuoteDocument[];
  }

  async findPendingByProvider(
    jobId: string,
    providerId: string
  ): Promise<QuoteDocument | null> {
    return this.findOne({ jobId, providerId, status: "pending" } as never);
  }

  /** Reject all pending quotes for a job except the accepted one. */
  async rejectOthers(jobId: string, acceptedQuoteId: string): Promise<void> {
    await this.updateMany(
      { jobId, _id: { $ne: acceptedQuoteId }, status: "pending" } as never,
      { status: "rejected" }
    );
  }

  /** All quotes submitted by a provider (any status). */
  async findByProvider(providerId: string): Promise<QuoteDocument[]> {
    await this.connect();
    return Quote.find({ providerId }).select("jobId status").lean() as unknown as QuoteDocument[];
  }

  /** Pending quotes older than cutoffDate (for auto-expiry). */
  async findStale(cutoffDate: Date): Promise<QuoteDocument[]> {
    await this.connect();
    return Quote.find({ status: "pending", createdAt: { $lt: cutoffDate } }).lean() as unknown as QuoteDocument[];
  }

  /** Quotes for a job with name/email/isVerified/avatar populated, sorted newest first. */
  async findForJobWithProvider(jobId: string): Promise<(QuoteDocument & {
    providerId: { _id: string; name: string; email: string; isVerified: boolean; avatar?: string | null };
  })[]> {
    await this.connect();
    return Quote.find({ jobId })
      .populate("providerId", "name email isVerified avatar")
      .sort({ createdAt: -1 })
      .lean() as never;
  }

  /**
   * Reject all quotes (accepted or pending) from a specific provider for a job.
   * Called when a provider is withdrawn or force-removed from a job.
   */
  async rejectByProvider(jobId: string, providerId: string): Promise<void> {
    await this.connect();
    await Quote.updateMany(
      { jobId, providerId, status: { $in: ["pending", "accepted"] } },
      { status: "rejected" }
    );
  }

  /**
   * Reject ALL pending/accepted quotes for a job regardless of provider.
   * Called when a client cancels an open job.
   */
  async rejectAllPending(jobId: string): Promise<void> {
    await this.connect();
    await Quote.updateMany(
      { jobId, status: { $in: ["pending", "accepted"] } },
      { status: "rejected" }
    );
  }

  /** Count of pending quotes submitted by a specific provider across all jobs. */
  async countPendingByProvider(providerId: string): Promise<number> {
    await this.connect();
    return Quote.countDocuments({ providerId: new Types.ObjectId(providerId), status: "pending" });
  }

  /** Pending quote counts grouped by jobId. Accepts ObjectId or string values. */
  async countPendingByJobIds(jobIds: unknown[]): Promise<{ _id: unknown; count: number }[]> {
    await this.connect();
    return Quote.aggregate([
      { $match: { jobId: { $in: jobIds }, status: "pending" } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
  }
}

export const quoteRepository = new QuoteRepository();
