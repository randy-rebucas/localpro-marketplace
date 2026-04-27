import { FilterQuery, Types, PipelineStage, type ClientSession } from "mongoose";
import Job from "@/models/Job";
import Message from "@/models/Message";
import type { JobDocument } from "@/models/Job";
import type { JobStatus, EscrowStatus } from "@/types";
import { BaseRepository } from "./base.repository";
import { cacheGet, cacheSet } from "@/lib/cache";

export type JobSortOption = "newest" | "oldest" | "budget_desc" | "budget_asc";

const SORT_MAP: Record<JobSortOption, Record<string, 1 | -1>> = {
  newest:      { createdAt: -1 },
  oldest:      { createdAt:  1 },
  budget_desc: { budget: -1 },
  budget_asc:  { budget:  1 },
};

export interface JobPaginationOptions {
  page?: number;
  limit?: number;
  sort?: JobSortOption;
  /** When true, `isPriority: true` jobs are sorted to the top of the result. */
  priorityFirst?: boolean;
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
    { page = 1, limit = 20, sort = "newest", priorityFirst = false }: JobPaginationOptions = {}
  ): Promise<PaginatedJobs> {
    await this.connect();
    const skip = (page - 1) * limit;
    const sortOrder: Record<string, 1 | -1> = priorityFirst
      ? { isPriority: -1, ...SORT_MAP[sort] }
      : SORT_MAP[sort];

    const [data, total] = await Promise.all([
      Job.find(filter)
        .sort(sortOrder)
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

  /** Aggregate jobs grouped by status. Cached for 5 minutes. */
  async countByStatus(): Promise<Array<{ _id: string; count: number }>> {
    const cacheKey = "cache:jobstats:byStatus";
    const cached = await cacheGet<Array<{ _id: string; count: number }>>(cacheKey);
    if (cached) return cached;

    await this.connect();
    const result = await Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    await cacheSet(cacheKey, result, 300); // 5 minutes
    return result;
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

  /** Stale completed jobs with funded escrow older than N days. Capped at 50 per run. */
  async findStaleCompletedJobs(olderThanDays: number = 7): Promise<JobDocument[]> {
    await this.connect();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    return Job.find({ status: "completed", escrowStatus: "funded", updatedAt: { $lt: cutoff } })
      .limit(50)
      .lean() as unknown as JobDocument[];
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

  /**
   * In-progress funded jobs whose scheduleDate has passed by more than the given cutoff.
   * Used by the auto-dispute cron to flag jobs that are overdue without completion.
   */
  async findOverdueInProgress(cutoff: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({
      status: "in_progress",
      escrowStatus: "funded",
      scheduleDate: { $lt: cutoff },
    })
      .select("_id title clientId providerId scheduleDate budget")
      .lean() as unknown as JobDocument[];
  }

  /** Completed jobs with released escrow whose escrow was released before cutoffDate (for review reminders). */
  async findReleasedUnreviewed(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "completed", escrowStatus: "released", updatedAt: { $lt: cutoffDate } }).lean() as unknown as JobDocument[];
  }

  /** Jobs stuck in pending_validation older than cutoffDate (for admin alerts). */
  async findStalePendingValidation(cutoffDate: Date): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "pending_validation", createdAt: { $lt: cutoffDate } })
      .select("_id title clientId createdAt")
      .lean() as unknown as JobDocument[];
  }

  /** Distinct provider user-IDs for jobs currently in an active state (assigned or in_progress).
   *  Uses aggregation to deduplicate in MongoDB instead of loading all documents into memory. */
  async findActiveProviderIds(): Promise<string[]> {
    await this.connect();
    const result = await Job.aggregate([
      { $match: { status: { $in: ["assigned", "in_progress"] }, providerId: { $ne: null } } },
      { $group: { _id: "$providerId" } },
    ]);
    return result.map((d) => d._id.toString());
  }

  /** All jobs for a client, newest first, with populated provider. For "My Jobs" list page. */
  async findAllForClient(
    clientId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
  ): Promise<PaginatedJobs> {
    await this.connect();
    const filter = { clientId: new Types.ObjectId(clientId) };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("providerId", "name email isVerified")
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
    specialInstructions?: string;
    beforePhoto?: string[];
    afterPhoto?: string[];
    providerId?: { _id: { toString(): string }; name: string; email: string; isVerified: boolean } | null;
    milestones?: import("@/types").IMilestone[];
    urgency?: "standard" | "same_day" | "rush";
    urgencyFee?: number;
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
    milestones?: import("@/types").IMilestone[];
    providerId?: { _id: { toString(): string }; name: string; email: string; isVerified: boolean } | null;
  }>> {
    await this.connect();
    return Job.find({
      clientId: new Types.ObjectId(clientId),
      status: { $in: ["assigned", "in_progress", "completed", "disputed"] },
    })
      .select("title category budget status escrowStatus providerId createdAt scheduleDate partialReleaseAmount milestones")
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

  /** Jobs scheduled for today (midnight → midnight) that the provider is assigned to. */
  async findTodayForProvider(providerId: string): Promise<Array<{
    _id: unknown; title: string; category: string; scheduleDate: Date;
    status: JobStatus; location: string;
  }>> {
    await this.connect();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Job.find({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress"] },
      scheduleDate: { $gte: startOfDay, $lt: endOfDay },
    })
      .select("title category scheduleDate status location")
      .sort({ scheduleDate: 1 })
      .limit(5)
      .lean() as never;
  }

  /** Jobs for the provider calendar — schedule-relevant fields only, sorted by scheduleDate. */
  async findCalendarJobsForProvider(providerId: string): Promise<Array<{
    _id: unknown; title: string; category: string; scheduleDate: Date;
    status: JobStatus; escrowStatus: string; budget: number; location: string;
    clientId: { _id: unknown; name: string } | null;
  }>> {
    await this.connect();
    return Job.find({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress", "completed", "disputed"] },
      scheduleDate: { $exists: true },
    })
      .select("title category scheduleDate status escrowStatus budget location clientId")
      .populate("clientId", "name")
      .sort({ scheduleDate: 1 })
      .lean() as never;
  }

  /** Active + completed jobs assigned to a provider, with client name, for the jobs list page. */
  async findActiveJobsForProvider(providerId: string): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({
      providerId: new Types.ObjectId(providerId),
      status: { $in: ["assigned", "in_progress", "completed", "disputed"] },
    })
      .populate("clientId", "name")
      .sort({ createdAt: -1 })
      .lean() as unknown as JobDocument[];
  }

  /** Single job verified to belong to this provider, with client populated. */
  async findByProviderAndId(providerId: string, jobId: string): Promise<{
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
    specialInstructions?: string;
    beforePhoto?: string[];
    afterPhoto?: string[];
    partialReleaseAmount?: number | null;
    riskScore: number;
    clientId: { _id: { toString(): string }; name: string; email: string } | null;
  } | null> {
    await this.connect();
    return Job.findOne({
      _id: new Types.ObjectId(jobId),
      providerId: new Types.ObjectId(providerId),
    })
      .populate("clientId", "name email")
      .lean() as never;
  }

  /** All provider jobs — minimal fields for the messages thread list, sorted by updatedAt.
   * Also includes open PESO/LGU jobs where the provider has sent at least one inquiry message. */
  async findJobsForMessagesProvider(providerId: string): Promise<Array<{
    _id: { toString(): string }; title: string; status: JobStatus;
  }>> {
    await this.connect();
    const providerObjId = new Types.ObjectId(providerId);

    // Jobs the provider is assigned to
    const assignedJobs = await Job.find({ providerId: providerObjId })
      .select("_id title status")
      .sort({ updatedAt: -1 })
      .lean();

    // PESO/LGU jobs where provider has sent inquiry messages (not yet assigned)
    const sentThreadIds = await Message.distinct("threadId", { senderId: providerObjId });
    const assignedJobIds = new Set(assignedJobs.map((j) => String(j._id)));
    // Only include threads not already in assignedJobs, and guard against non-ObjectId strings
    const inquiryThreadIds = sentThreadIds.filter(
      (id: string) => !assignedJobIds.has(id) && Types.ObjectId.isValid(id)
    );

    let inquiryJobs: Array<{ _id: unknown; title: string; status: string }> = [];
    if (inquiryThreadIds.length > 0) {
      inquiryJobs = await Job.find({
        _id: { $in: inquiryThreadIds.map((id: string) => new Types.ObjectId(id)) },
        jobSource: { $in: ["peso", "lgu"] },
      })
        .select("_id title status")
        .sort({ updatedAt: -1 })
        .lean();
    }

    return [...assignedJobs, ...inquiryJobs] as never;
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

  /** Jobs for the message-threads list: all jobs where userId is client or provider,
   *  with clientId and providerId populated (name, avatar). Paginated. */
  async findForMessageThreads(
    userId: string,
    limit = 30,
    skip = 0
  ): Promise<Array<{
    _id: { toString(): string };
    title: string;
    createdAt: Date;
    clientId: { _id: { toString(): string }; name: string; avatar?: string | null };
    providerId: { _id: { toString(): string }; name: string; avatar?: string | null } | null;
  }>> {
    await this.connect();
    const oid = new Types.ObjectId(userId);
    return Job.find({ $or: [{ clientId: oid }, { providerId: oid }] })
      .populate("clientId", "_id name avatar")
      .populate("providerId", "_id name avatar")
      .select("_id title createdAt clientId providerId")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as never;
  }

  /**
   * Patch a job's status + one photo field using the native driver to bypass
   * Mongoose schema casting (allows storing arbitrary string arrays).
   */
  async updateStatusAndPhoto(
    id: string,
    status: string,
    photoField: "beforePhoto" | "afterPhoto",
    photos: string[]
  ): Promise<void> {
    await this.connect();
    await Job.collection.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { status, [photoField]: photos } }
    );
  }

  /** Mark a job's escrow as funded and persist the fee snapshot. */
  async fundEscrow(
    jobId: string,
    fees: { escrowFee: number; processingFee: number; platformServiceFee: number },
    session?: ClientSession
  ): Promise<void> {
    await this.connect();
    await Job.findByIdAndUpdate(
      jobId,
      { $set: { escrowStatus: "funded", ...fees } },
      { session }
    );
  }

  /** Count jobs for a provider filtered by an array of statuses. */
  async countByProvider(providerId: string, statuses: string[]): Promise<number> {
    await this.connect();
    return Job.countDocuments({
      providerId: new Types.ObjectId(providerId),
      status: { $in: statuses },
    });
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

  /** Completed jobs with funded escrow awaiting admin payment release (all, no date filter). */
  async findAwaitingPaymentRelease(
    { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
  ): Promise<{
    data: Array<{
      _id: { toString(): string };
      title: string;
      category: string;
      budget: number;
      updatedAt: Date;
      clientId: { name: string; email: string };
      providerId: { _id: { toString(): string }; name: string; email: string } | null;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.connect();
    const filter = { status: "completed", escrowStatus: "funded" };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Job.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("clientId", "name email")
        .populate("providerId", "name email")
        .lean(),
      Job.countDocuments(filter),
    ]);
    return {
      data: data as never,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Unique providers a client has previously hired (completed jobs). Used for the preferred-provider picker. */
  async findPastProviders(
    clientId: string
  ): Promise<Array<{ _id: string; name: string; email: string }>> {
    await this.connect();
    return Job.aggregate([
      { $match: { clientId: new Types.ObjectId(clientId), status: "completed", providerId: { $ne: null } } },
      { $group: { _id: "$providerId" } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { _id: { $toString: "$user._id" }, name: "$user.name", email: "$user.email" } },
      { $sort: { name: 1 } },
    ]);
  }

  /** Jobs awaiting admin validation, newest first, with client info populated. */
  async findPendingValidation(): Promise<Array<{
    _id: unknown; title: string; description: string; category: string;
    location: string; budget: number; scheduleDate: Date; riskScore: number;
    fraudFlags?: string[]; recurringScheduleId?: string | null;
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

  /**
   * Returns the most recent completed job date per unique category for a client.
   * Used to compute maintenance schedule reminders.
   */
  async findLastCompletedByCategory(
    clientId: string
  ): Promise<Array<{ category: string; completedAt: Date; budget: number }>> {
    await this.connect();
    const results = await Job.aggregate<{ category: string; completedAt: Date; budget: number }>([
      {
        $match: {
          clientId: new Types.ObjectId(clientId),
          status: "completed",
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: "$category",
          completedAt: { $first: "$updatedAt" },
          budget: { $first: "$budget" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          completedAt: 1,
          budget: 1,
        },
      },
    ]);
    return results;
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  /** Jobs matching the regex across title/category/location — for admin global search. */
  async searchForAdmin(
    regex: RegExp
  ): Promise<Array<{ _id: unknown; title: string; status: string; category: string }>> {
    await this.connect();
    return Job.find({ $or: [{ title: regex }, { category: regex }, { location: regex }] })
      .limit(5)
      .select("_id title status category")
      .lean() as never;
  }

  /** Jobs belonging to a specific client matching the regex — for client global search. */
  async searchForClient(
    clientId: string,
    regex: RegExp
  ): Promise<Array<{ _id: unknown; title: string; status: string; category: string }>> {
    await this.connect();
    return Job.find({
      clientId,
      $or: [{ title: regex }, { category: regex }],
    })
      .limit(5)
      .select("_id title status category")
      .lean() as never;
  }

  /** Open jobs matching the regex across title/category/location — for provider global search. */
  async searchForProvider(
    regex: RegExp
  ): Promise<Array<{ _id: unknown; title: string; category: string; location: string }>> {
    await this.connect();
    return Job.find({
      status: "open",
      $or: [{ title: regex }, { category: regex }, { location: regex }],
    })
      .limit(5)
      .select("_id title category location")
      .lean() as never;
  }

  /**
   * Returns the last N completed jobs for a client, for AI recommendation context.
   */
  async findCompletedForClient(
    clientId: string,
    limit = 10
  ): Promise<Array<{ category: string; budget: number }>> {
    await this.connect();
    return Job.find({ clientId: new Types.ObjectId(clientId), status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("category budget")
      .lean() as never;
  }

  /** Count jobs with "rejected" status posted by a specific client. */
  async countRejectedByClient(clientId: string): Promise<number> {
    await this.connect();
    return Job.countDocuments({
      clientId: new Types.ObjectId(clientId),
      status: "rejected",
    });
  }

  /**
   * Find jobs with fraud flags or a high risk score (≥ threshold).
   * Used by the admin fraud monitoring dashboard.
   */
  async findFlaggedJobs(opts: {
    riskThreshold?: number;
    limit?: number;
  } = {}): Promise<Array<{
    _id: { toString(): string };
    title: string;
    category: string;
    budget: number;
    status: string;
    riskScore: number;
    fraudFlags: string[];
    clientId: { _id: { toString(): string }; name: string; email: string };
    createdAt: Date;
  }>> {
    await this.connect();
    const threshold = opts.riskThreshold ?? 50;
    return Job.find({
      $or: [
        { fraudFlags: { $exists: true, $not: { $size: 0 } } },
        { riskScore: { $gte: threshold } },
      ],
    })
      .sort({ riskScore: -1, createdAt: -1 })
      .limit(opts.limit ?? 100)
      .populate("clientId", "name email")
      .select("title category budget status riskScore fraudFlags clientId createdAt")
      .lean() as never;
  }
  // ─── Geo-proximity search ─────────────────────────────────────────────────

  /**
   * Find jobs near a geographic point using the `coordinates` 2dsphere index.
   * Returns results sorted by distance (closest first) with a `distance` field in meters.
   *
   * @param coordinates - [longitude, latitude]
   * @param maxDistanceMeters - maximum search radius in meters
   * @param filter - additional match criteria (status, category, etc.)
   * @param options - pagination options
   */
  async findNearby(
    coordinates: [number, number],
    maxDistanceMeters: number,
    filter?: Record<string, unknown>,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedJobs> {
    await this.connect();

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates },
          distanceField: "distance",
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: {
            "coordinates.coordinates": { $ne: null },
            ...filter,
          },
        },
      },
    ];

    // Count total matching documents (before pagination)
    const countPipeline: PipelineStage[] = [
      ...pipeline,
      { $count: "total" },
    ];

    // Data pipeline with pagination and population via $lookup
    const dataPipeline: PipelineStage[] = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "clientId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1 } }],
          as: "_clientArr",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "providerId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1 } }],
          as: "_providerArr",
        },
      },
      {
        $addFields: {
          clientId: { $arrayElemAt: ["$_clientArr", 0] },
          providerId: {
            $cond: {
              if: { $gt: [{ $size: "$_providerArr" }, 0] },
              then: { $arrayElemAt: ["$_providerArr", 0] },
              else: null,
            },
          },
        },
      },
      { $unset: ["_clientArr", "_providerArr"] },
    ];

    const [countResult, data] = await Promise.all([
      Job.aggregate(countPipeline),
      Job.aggregate(dataPipeline),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: data as unknown as JobDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Open jobs for the provider marketplace with client info populated. */
  async findOpenForMarketplace(limit = 100): Promise<JobDocument[]> {
    await this.connect();
    return Job.find({ status: "open" })
      .populate("clientId", "name isVerified avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as JobDocument[];
  }

  /**
   * Atomically assign a provider to an open job (CAS guard: status must be "open").
   * Updates status → "assigned" and sets budget to the accepted quote amount.
   * Returns null if the job was concurrently modified.
   */
  async atomicAssignProvider(
    jobId: string,
    providerId: string,
    proposedAmount: number
  ): Promise<JobDocument | null> {
    await this.connect();
    return Job.findOneAndUpdate(
      { _id: jobId, status: "open" },
      { $set: { providerId, status: "assigned", budget: proposedAmount } },
      { new: true }
    ).lean() as unknown as JobDocument | null;
  }
}

export const jobRepository = new JobRepository();
