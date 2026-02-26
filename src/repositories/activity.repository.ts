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
}

export const activityRepository = new ActivityRepository();
