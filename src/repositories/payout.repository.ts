import Payout from "@/models/Payout";
import type { PayoutDocument } from "@/models/Payout";
import { BaseRepository } from "./base.repository";

export class PayoutRepository extends BaseRepository<PayoutDocument> {
  constructor() {
    super(Payout);
  }

  async findByProvider(providerId: string): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({ providerId })
      .sort({ createdAt: -1 })
      .lean() as unknown as PayoutDocument[];
  }

  async findAllWithProvider(): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({})
      .sort({ createdAt: -1 })
      .populate("providerId", "name email")
      .lean() as unknown as PayoutDocument[];
  }

  /** Sum of approved/processing payouts for a provider (already paid or in-flight) */
  async sumPaidOut(providerId: string): Promise<number> {
    await this.connect();
    const result = await Payout.aggregate([
      {
        $match: {
          providerId: new (require("mongoose").Types.ObjectId)(providerId),
          status: { $in: ["pending", "processing", "completed"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /** Sum of all completed payouts across all providers (for reconciliation) */
  async sumAllCompleted(): Promise<number> {
    await this.connect();
    const result = await Payout.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * Sum of all payouts that have been ring-fenced from Earnings Payable (2100).
   * Includes pending + processing + completed; excludes rejected (which are
   * returned to 2100 via payout_rejected ledger entry).
   * Used for reconciliation of account 2100.
   */
  async sumAllNetRequested(): Promise<number> {
    await this.connect();
    const result = await Payout.aggregate([
      { $match: { status: { $in: ["pending", "processing", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /** Payout requests that have been in "pending" status since before `cutoff` */
  async findStalePending(cutoff: Date): Promise<PayoutDocument[]> {
    await this.connect();
    return Payout.find({ status: "pending", createdAt: { $lt: cutoff } })
      .lean() as unknown as PayoutDocument[];
  }

  /** Per-status breakdown for a provider. */
  async getProviderStats(providerId: string): Promise<{
    totalCompleted: number;
    totalPending: number;
    totalProcessing: number;
    pendingCount: number;
  }> {
    await this.connect();
    const rows = await Payout.aggregate([
      { $match: { providerId: new (require("mongoose").Types.ObjectId)(providerId) } },
      { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]) as Array<{ _id: string; total: number; count: number }>;

    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r]));
    return {
      totalCompleted:  byStatus.completed?.total   ?? 0,
      totalPending:    byStatus.pending?.total      ?? 0,
      totalProcessing: byStatus.processing?.total   ?? 0,
      pendingCount:    (byStatus.pending?.count ?? 0) + (byStatus.processing?.count ?? 0),
    };
  }
}

export const payoutRepository = new PayoutRepository();
