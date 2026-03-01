import ActivityLog from "@/models/ActivityLog";
import type { ActivityLogDocument } from "@/models/ActivityLog";
import type { ActivityEventType } from "@/types";
import { BaseRepository } from "./base.repository";

export interface LogEventInput {
  userId: string;
  eventType: ActivityEventType;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

export class ActivityRepository extends BaseRepository<ActivityLogDocument> {
  constructor() {
    super(ActivityLog);
  }

  async log(event: LogEventInput): Promise<void> {
    await this.create(event);
  }

  /** Delete activity log entries older than `before`. Returns the count removed. */
  async pruneOld(before: Date): Promise<number> {
    await this.connect();
    const result = await ActivityLog.deleteMany({ createdAt: { $lt: before } });
    return result.deletedCount ?? 0;
  }
}

export const activityRepository = new ActivityRepository();
