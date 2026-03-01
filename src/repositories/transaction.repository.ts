import { Types } from "mongoose";
import Transaction from "@/models/Transaction";
import type { TransactionDocument } from "@/models/Transaction";
import { BaseRepository } from "./base.repository";

export class TransactionRepository extends BaseRepository<TransactionDocument> {
  constructor() {
    super(Transaction);
  }

  async findCompleted(): Promise<Array<{ amount: number; commission: number }>> {
    await this.connect();
    return Transaction.find({ status: "completed" })
      .select("amount commission")
      .lean() as unknown as Array<{ amount: number; commission: number }>;
  }

  async setPending(jobId: string, status: "completed" | "refunded"): Promise<void> {
    await this.updateMany({ jobId, status: "pending" } as never, { status });
  }

  /** All transactions where this user is the payee, with jobId.title populated, newest first. */
  async findByPayeeWithJob(payeeId: string): Promise<Array<{
    _id: unknown; amount: number; commission: number; netAmount: number;
    status: string; createdAt: Date;
    jobId: { title: string } | null;
  }>> {
    await this.connect();
    return Transaction.find({ payeeId: new Types.ObjectId(payeeId) })
      .sort({ createdAt: -1 })
      .populate("jobId", "title")
      .lean() as never;
  }

  /** Single-document aggregation: gross/commission/net totals for a payee's completed transactions. */
  async sumCompletedByPayee(payeeId: string): Promise<{ gross: number; commission: number; net: number }> {
    await this.connect();
    const [result] = await Transaction.aggregate<{ gross: number; commission: number; net: number }>([
      { $match: { payeeId: new Types.ObjectId(payeeId), status: "completed" } },
      { $group: { _id: null, gross: { $sum: "$amount" }, commission: { $sum: "$commission" }, net: { $sum: "$netAmount" } } },
    ]);
    return result ?? { gross: 0, commission: 0, net: 0 };
  }

  /** Platform totals: gross GMV and commission across all completed transactions. */
  async getAdminTotals(): Promise<{ gmv: number; commission: number }> {
    await this.connect();
    const [result] = await Transaction.aggregate<{ gmv: number; commission: number }>([
      { $match: { status: "completed" } },
      { $group: { _id: null, gmv: { $sum: "$amount" }, commission: { $sum: "$commission" } } },
    ]);
    return result ?? { gmv: 0, commission: 0 };
  }

  /** Monthly GMV / commission / job-count breakdown for completed transactions after `since`. */
  async getMonthlyRevenue(since: Date): Promise<Array<{
    _id: { year: number; month: number };
    gmv: number; commission: number; jobs: number;
  }>> {
    await this.connect();
    return Transaction.aggregate([
      { $match: { status: "completed", createdAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          gmv: { $sum: "$amount" },
          commission: { $sum: "$commission" },
          jobs: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
  }

  /** Top N providers by total net payout (completed transactions). */
  async getTopPayees(limit: number): Promise<Array<{ _id: unknown; earned: number }>> {
    await this.connect();
    return Transaction.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$payeeId", earned: { $sum: "$netAmount" } } },
      { $sort: { earned: -1 } },
      { $limit: limit },
    ]);
  }

  /** Sum of amounts for all completed transactions paid by a given client. */
  async sumCompletedByPayer(payerId: string): Promise<number> {
    await this.connect();
    const [result] = await Transaction.aggregate<{ total: number }>([
      { $match: { payerId: new Types.ObjectId(payerId), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result?.total ?? 0;
  }

  /** Sum of amounts for all pending (funded-but-not-released) transactions by a client. */
  async sumPendingByPayer(payerId: string): Promise<number> {
    await this.connect();
    const [result] = await Transaction.aggregate<{ total: number }>([
      { $match: { payerId: new Types.ObjectId(payerId), status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result?.total ?? 0;
  }

  /** Per-job funded amounts for all pending transactions by a client. Returns a jobId→amount map. */
  async findPendingByPayer(payerId: string): Promise<Map<string, number>> {
    await this.connect();
    const rows = await Transaction.find(
      { payerId: new Types.ObjectId(payerId), status: "pending" },
      { jobId: 1, amount: 1 }
    ).lean() as Array<{ jobId: { toString(): string }; amount: number }>;
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.jobId.toString(), r.amount);
    return map;
  }

  /** Per-job funded amounts for all pending transactions where the provider is the payee.
   *  Returns a jobId → { gross, net } map. */
  async findFundedByPayee(payeeId: string): Promise<Map<string, { gross: number; net: number }>> {
    await this.connect();
    const rows = await Transaction.find(
      { payeeId: new Types.ObjectId(payeeId), status: "pending" },
      { jobId: 1, amount: 1, netAmount: 1 }
    ).lean() as Array<{ jobId: { toString(): string }; amount: number; netAmount: number }>;
    const map = new Map<string, { gross: number; net: number }>();
    for (const r of rows) map.set(r.jobId.toString(), { gross: r.amount, net: r.netAmount });
    return map;
  }
}

export const transactionRepository = new TransactionRepository();
