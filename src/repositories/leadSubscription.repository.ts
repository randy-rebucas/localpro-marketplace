import { connectDB } from "@/lib/db";
import LeadSubscription, { LeadSubscriptionDocument } from "@/models/LeadSubscription";

class LeadSubscriptionRepository {
  async create(data: {
    providerId: string;
    startsAt: Date;
    expiresAt: Date;
    amountPaid: number;
    walletTxId?: string | null;
    paymongoSessionId?: string | null;
    ledgerJournalId?: string | null;
  }): Promise<LeadSubscriptionDocument> {
    await connectDB();
    const doc = await LeadSubscription.create({ ...data, status: "active" });
    return doc;
  }

  async findActiveByProvider(providerId: string): Promise<LeadSubscriptionDocument | null> {
    await connectDB();
    return LeadSubscription.findOne({
      providerId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).lean() as unknown as LeadSubscriptionDocument | null;
  }

  async findByPaymongoSession(sessionId: string): Promise<LeadSubscriptionDocument | null> {
    await connectDB();
    return LeadSubscription.findOne({ paymongoSessionId: sessionId }).lean() as unknown as LeadSubscriptionDocument | null;
  }

  async findAllByProvider(providerId: string, limit = 20): Promise<LeadSubscriptionDocument[]> {
    await connectDB();
    return LeadSubscription.find({ providerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as LeadSubscriptionDocument[];
  }

  async findById(id: string): Promise<LeadSubscriptionDocument | null> {
    await connectDB();
    return LeadSubscription.findById(id).lean() as unknown as LeadSubscriptionDocument | null;
  }

  async findExpiredActive(): Promise<LeadSubscriptionDocument[]> {
    await connectDB();
    return LeadSubscription.find({
      status: "active",
      expiresAt: { $lte: new Date() },
    }).lean() as unknown as LeadSubscriptionDocument[];
  }

  async updateStatus(id: string, status: "active" | "cancelled" | "expired"): Promise<void> {
    await connectDB();
    await LeadSubscription.findByIdAndUpdate(id, { status });
  }

  /** Bulk expire all active subscriptions whose expiresAt has passed. */
  async expireStale(): Promise<number> {
    await connectDB();
    const result = await LeadSubscription.updateMany(
      { status: "active", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } }
    );
    return result.modifiedCount;
  }
}

export const leadSubscriptionRepository = new LeadSubscriptionRepository();
