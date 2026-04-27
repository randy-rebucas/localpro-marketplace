import ActivityLog from "@/models/ActivityLog";
import type { ActivityLogDocument } from "@/models/ActivityLog";
import type { ActivityEventType } from "@/types";
import { BaseRepository } from "./base.repository";

export interface LogEventInput {
  userId: string;
  eventType: ActivityEventType;
  jobId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ActivityLogEntry {
  _id: string;
  userId: { _id: string; name: string; email?: string; role: string } | string;
  eventType: ActivityEventType;
  jobId?: { _id: string; title: string; status?: string; budget?: number } | string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: Date;
}

export class ActivityRepository extends BaseRepository<ActivityLogDocument> {
  constructor() {
    super(ActivityLog);
  }

  async log(event: LogEventInput): Promise<void> {
    await this.create(event);
  }

  /** Paginated log fetch with user + job population for the admin log viewer. */
  async findWithRefs(opts: {
    eventType?: ActivityEventType;
    page?: number;
    limit?: number;
  } = {}): Promise<{ logs: ActivityLogEntry[]; total: number }> {
    await this.connect();
    const { eventType, page = 1, limit = 50 } = opts;
    const filter = eventType ? { eventType } : {};
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name email role")
        .populate("jobId", "title status budget")
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);
    return { logs: logs as unknown as ActivityLogEntry[], total };
  }

  /** Single log with full population for the detail page. */
  async findByIdWithRefs(id: string): Promise<ActivityLogEntry | null> {
    await this.connect();
    const log = await ActivityLog.findById(id)
      .populate("userId", "name email role")
      .populate("jobId", "title status budget")
      .lean();
    return log as unknown as ActivityLogEntry | null;
  }

  /** Recent logs for the same job (excluding the current log). */
  async findRelatedByJob(jobId: string, excludeId: string, limit = 8): Promise<ActivityLogEntry[]> {
    await this.connect();
    const logs = await ActivityLog.find({ jobId, _id: { $ne: excludeId } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name role")
      .lean();
    return logs as unknown as ActivityLogEntry[];
  }

  /** Recent logs for the same user (excluding the current log). */
  async findRecentByUser(userId: string, excludeId: string, limit = 8): Promise<ActivityLogEntry[]> {
    await this.connect();
    const logs = await ActivityLog.find({ userId, _id: { $ne: excludeId } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("jobId", "title")
      .lean();
    return logs as unknown as ActivityLogEntry[];
  }

  /** Paginated activity for a specific user — used in the admin user detail page. */
  async findByUser(
    userId: string,
    opts: { page?: number; limit?: number } = {}
  ): Promise<{ logs: ActivityLogEntry[]; total: number }> {
    await this.connect();
    const { page = 1, limit = 20 } = opts;
    const [logs, total] = await Promise.all([
      ActivityLog.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("jobId", "title status")
        .lean(),
      ActivityLog.countDocuments({ userId }),
    ]);
    return { logs: logs as unknown as ActivityLogEntry[], total };
  }

  /** Count events today, this week, and all-time (for stats strip). */
  async countRecent(): Promise<{ today: number; week: number; total: number }> {
    await this.connect();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek  = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const [today, week, total] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      ActivityLog.countDocuments({ createdAt: { $gte: startOfWeek } }),
      ActivityLog.countDocuments({}),
    ]);
    return { today, week, total };
  }

  /** Delete activity log entries older than `before`. Returns the count removed. */
  async pruneOld(before: Date): Promise<number> {
    await this.connect();
    const result = await ActivityLog.deleteMany({ createdAt: { $lt: before } });
    return result.deletedCount ?? 0;
  }
}

export const activityRepository = new ActivityRepository();

