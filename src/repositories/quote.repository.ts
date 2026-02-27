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

  /** Pending quotes older than cutoffDate (for auto-expiry). */
  async findStale(cutoffDate: Date): Promise<QuoteDocument[]> {
    await this.connect();
    return Quote.find({ status: "pending", createdAt: { $lt: cutoffDate } }).lean() as unknown as QuoteDocument[];
  }
}

export const quoteRepository = new QuoteRepository();
