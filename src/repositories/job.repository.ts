import { FilterQuery, Types } from "mongoose";
import Job from "@/models/Job";
import type { JobDocument } from "@/models/Job";
import type { JobStatus, EscrowStatus } from "@/types";
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

  /** Assigned + funded jobs that haven't moved to in_progress before cutoffDate. */
  async findAssignedFundedNotStarted(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "assigned", escrowStatus: "funded", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** Jobs stuck in_progress since before cutoffDate (provider hasn't completed). */
  async findStaleInProgress(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "in_progress", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** Completed jobs with released escrow whose escrow was released before cutoffDate (for review reminders). */
  async findReleasedUnreviewed(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "completed", escrowStatus: "released", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** All jobs for a client, newest first, with populated provider. For "My Jobs" list page. */
  async findAllForClient(clientId: string): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ clientId: new Types.ObjectId(clientId) })
      .sort({ createdAt: -1 })
      .populate("providerId", "name email isVerified")
      .lean() as unknown as JobDocument[];
  }

  /** Single job verified to belong to this client, with client + provider populated. */
  async findByClientAndId(clientId: string, jobId: string): Promise<{
    _id: { toString(): string };
    title: string;
    category: string;
    location: string;
    description: string;
    budget: number;
    scheduleDate: Date;
    createdAt: Date;
    status: JobStatus;
    escrowStatus: EscrowStatus;
    riskScore: number;
    providerId?: { _id: { toString(): string }; name: string; email: string; isVerified: boolean } | null;
  } | null> {
    await this.connect();
    return Job.findOne({
      _id: new Types.ObjectId(jobId),
      clientId: new Types.ObjectId(clientId),
    })
      .populate("clientId", "name email")
      .populate("providerId", "name email isVerified")
      .lean() as never;
  }

  /** Jobs requiring escrow action for a client (assigned/in_progress/completed), provider populated. */
  async findEscrowJobsForClient(clientId: string): Promise<Array<{
    _id: { toString(): string };
    title: string;
    budget: number;
    status: JobStatus;
    escrowStatus: EscrowStatus;
    scheduleDate: Date;
    providerId?: { _id: { toString(): string }; name: string; email: string; isVerified: boolean } | null;
  }>> {
    await this.connect();
    return Job.find({
      clientId: new Types.ObjectId(clientId),
      status: { $in: ["assigned", "in_progress", "completed"] },
    })
      .select("title category budget status escrowStatus providerId createdAt scheduleDate partialReleaseAmount")
      .populate("providerId", "name email isVerified")
      .sort({ createdAt: -1 })
      .lean() as never;
  }

  // ─── Provider-facing methods ────────────────────────────────────────────────

  /** Count active (assigned + in_progress) jobs for a provider. */
  async countActiveForProvider(providerId: string): Promise<number> {
    await this.connect();
    return Job.countDocuments({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress"] },
    });
  }

  /** Recent jobs for a provider — only dashboard-needed fields. */
  async findRecentForProvider(
    providerId: string,
    limit = 5
  ): Promise<Array<{ _id: unknown; title: string; status: JobStatus; budget: number; category: string; createdAt: Date }>> {
    await this.connect();
    return Job.find({ providerId: new Types.ObjectId(providerId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title status budget category createdAt")
      .lean() as never;
  }

  /** Jobs for the provider calendar — schedule-relevant fields only, sorted by scheduleDate. */
  async findCalendarJobsForProvider(providerId: string): Promise<Array<{
    _id: unknown; title: string; category: string; scheduleDate: Date;
    status: JobStatus; budget: number; location: string;
  }>> {
    await this.connect();
    return Job.find({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress", "completed"] },
      scheduleDate: { $exists: true },
    })
      .select("title category scheduleDate status budget location")
      .sort({ scheduleDate: 1 })
      .lean() as never;
  }

  /** Active + completed jobs assigned to a provider, with client name, for the jobs list page. */
  async findActiveJobsForProvider(providerId: string): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress", "completed"] },
    })
      .populate("clientId", "name")
      .sort({ createdAt: -1 })
      .lean() as unknown as JobDocument[];
  }

  /** All provider jobs — minimal fields for the messages thread list, sorted by updatedAt. */
  async findJobsForMessagesProvider(providerId: string): Promise<Array<{
    _id: { toString(): string }; title: string; status: JobStatus;
  }>> {
    await this.connect();
    return Job.find({ providerId: new Types.ObjectId(providerId) })
      .select("_id title status")
      .sort({ updatedAt: -1 })
      .lean() as never;
  }

  /** Jobs for a client that have a provider assigned (i.e. have a chat thread). */
  async findJobsForMessagesClient(clientId: string): Promise<Array<{
    _id: { toString(): string }; title: string; status: JobStatus;
  }>> {
    await this.connect();
    return Job.find({
      clientId: new Types.ObjectId(clientId),
      providerId: { $exists: true, $ne: null },
    })
      .select("_id title status")
      .sort({ updatedAt: -1 })
      .lean() as never;
  }

  /** Count jobs posted by a client on or after the given date (for daily cap enforcement). */
  async countByClientSince(clientId: string, since: Date): Promise<number> {
    await this.connect();
    return Job.countDocuments({ clientId, createdAt: { $gte: since } });
  }

  /** Count active jobs (open/assigned/in_progress) for a client. */
  async countActiveForClient(clientId: string): Promise<number> {
    await this.connect();
    return Job.countDocuments({
      clientId: new Types.ObjectId(clientId),
      status: { $in: ["open", "assigned", "in_progress"] },
    });
  }

  /** Sum of budgets for all funded-escrow jobs owned by a client. Single aggregation doc returned. */
  async sumFundedEscrowForClient(clientId: string): Promise<number> {
    await this.connect();
    const [result] = await Job.aggregate<{ total: number }>([
      { $match: { clientId: new Types.ObjectId(clientId), escrowStatus: "funded" } },
      { $group: { _id: null, total: { $sum: "$budget" } } },
    ]);
    return result?.total ?? 0;
  }

  /** Jobs awaiting admin validation, newest first, with client info populated. */
  async findPendingValidation(): Promise<Array<{
    _id: unknown; title: string; description: string; category: string;
    location: string; budget: number; scheduleDate: Date; riskScore: number;
    createdAt: Date; clientId: { name: string; email: string };
  }>> {
    await this.connect();
    return Job.find({ status: "pending_validation" })
      .sort({ createdAt: -1 })
      .populate("clientId", "name email")
      .lean() as never;
  }

  /** Total budget of all funded-escrow jobs (platform escrow balance). Single aggregation. */
  async sumFundedEscrowBalance(): Promise<number> {
    await this.connect();
    const [result] = await Job.aggregate<{ balance: number }>([
      { $match: { escrowStatus: "funded" } },
      { $group: { _id: null, balance: { $sum: "$budget" } } },
    ]);
    return result?.balance ?? 0;
  }

  /** Recent jobs for a client — only fields needed by the dashboard. */
  async findRecentForClient(
    clientId: string,
    limit = 5
  ): Promise<Array<{ _id: unknown; title: string; status: JobStatus; budget: number; category: string; createdAt: Date }>> {
    await this.connect();
    return Job.find({ clientId: new Types.ObjectId(clientId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title status budget category createdAt")
      .lean() as never;
  }
}

export const jobRepository = new JobRepository();
