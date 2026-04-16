import Payout from "@/models/Payout";
import type { PayoutDocument } from "@/models/Payout";
import { BaseRepository } from "./base.repository";

export interface PaginatedPayouts {
  data: PayoutDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

  async findAllWithProvider(
    page = 1,
    limit = 20
  ): Promise<PaginatedPayouts> {
    await this.connect();
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Payout.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("providerId", "name email")
        .lean(),
      Payout.countDocuments({}),
    ]);
    return {
      data: data as unknown as PayoutDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
  /** Count completed payouts for a provider (used for auto-approval eligibility). */
  async countCompletedByProvider(providerId: string): Promise<number> {
    await this.connect();
    return Payout.countDocuments({
      providerId: new (require("mongoose").Types.ObjectId)(providerId),
      status: "completed",
    });
  }

  /**
   * Per-provider sum of paid-out amounts (pending + processing + completed).
   * Used by the admin provider-payable view to calculate what is still owed.
   */
  async aggregatePaidOutByProvider(): Promise<Array<{ _id: unknown; paidOut: number }>> {
    await this.connect();
    return Payout.aggregate([
      { $match: { status: { $in: ["pending", "processing", "completed"] } } },
      { $group: { _id: "$providerId", paidOut: { $sum: "$amount" } } },
    ]);
  }
}

export const payoutRepository = new PayoutRepository();
