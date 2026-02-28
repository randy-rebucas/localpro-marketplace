import Quote from "@/models/Quote";
import type { QuoteDocument } from "@/models/Quote";
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

  /** Quotes for a job with name/email/isVerified populated, sorted newest first. */
  async findForJobWithProvider(jobId: string): Promise<(QuoteDocument & {
    providerId: { _id: string; name: string; email: string; isVerified: boolean };
  })[]> {
    await this.connect();
    return Quote.find({ jobId })
      .populate("providerId", "name email isVerified")
      .sort({ createdAt: -1 })
      .lean() as never;
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
