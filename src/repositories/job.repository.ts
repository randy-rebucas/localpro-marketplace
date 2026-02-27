import { FilterQuery } from "mongoose";
import Job from "@/models/Job";
import type { JobDocument } from "@/models/Job";
import { BaseRepository } from "./base.repository";

export interface JobPaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedJobs {
  data: JobDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class JobRepository extends BaseRepository<JobDocument> {
  constructor() {
    super(Job);
  }

  async findPaginated(
    filter: FilterQuery<JobDocument>,
    { page = 1, limit = 20 }: JobPaginationOptions = {}
  ): Promise<PaginatedJobs> {
    await this.connect();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("clientId", "name email")
        .populate("providerId", "name email")
        .lean(),
      Job.countDocuments(filter),
    ]);

    return {
      data: data as unknown as JobDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdPopulated(id: string): Promise<JobDocument | null> {
    await this.connect();
    return Job.findById(id)
      .populate("clientId", "name email")
      .populate("providerId", "name email")
      .lean() as unknown as JobDocument | null;
  }

  /** Aggregate jobs grouped by status. */
  async countByStatus(): Promise<Array<{ _id: string; count: number }>> {
    await this.connect();
    return Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  }

  /** Returns jobs with funded escrow (budget field only). */
  async findFundedEscrow(): Promise<Array<{ budget: number }>> {
    await this.connect();
    return Job.find({ escrowStatus: "funded" }).select("budget").lean();
  }

  /** Open jobs older than cutoffDate (for auto-expiry). */
  async findStaleOpen(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "open", createdAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** Completed jobs whose escrow is still funded and were updated before cutoffDate (for auto-release). */
  async findCompletedPendingRelease(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "completed", escrowStatus: "funded", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** Assigned jobs with unfunded escrow updated before cutoffDate (for reminders). */
  async findAssignedUnfunded(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "assigned", escrowStatus: "not_funded", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }
}

export const jobRepository = new JobRepository();
