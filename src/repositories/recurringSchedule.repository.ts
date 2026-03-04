import { FilterQuery } from "mongoose";
import { BaseRepository } from "./base.repository";
import RecurringSchedule, {
  type RecurringScheduleDocument,
} from "@/models/RecurringSchedule";
import type { RecurringStatus } from "@/types";

class RecurringScheduleRepository extends BaseRepository<RecurringScheduleDocument> {
  constructor() {
    super(RecurringSchedule);
  }

  async findByClient(
    clientId: string,
    status?: RecurringStatus
  ): Promise<RecurringScheduleDocument[]> {
    await this.connect();
    const filter: FilterQuery<RecurringScheduleDocument> = { clientId };
    if (status) filter.status = status;
    return RecurringSchedule.find(filter)
      .sort({ createdAt: -1 })
      .lean() as unknown as RecurringScheduleDocument[];
  }

  /** Find all active schedules whose next run is due (nextRunAt <= now). */
  async findDue(): Promise<RecurringScheduleDocument[]> {
    await this.connect();
    return RecurringSchedule.find({
      status: "active",
      nextRunAt: { $lte: new Date() },
    })
      .lean() as unknown as RecurringScheduleDocument[];
  }

  async pause(id: string): Promise<RecurringScheduleDocument | null> {
    await this.connect();
    return RecurringSchedule.findByIdAndUpdate(
      id,
      { status: "paused", pausedAt: new Date() },
      { new: true }
    ).lean() as unknown as RecurringScheduleDocument | null;
  }

  async resume(id: string, nextRunAt: Date): Promise<RecurringScheduleDocument | null> {
    await this.connect();
    return RecurringSchedule.findByIdAndUpdate(
      id,
      { status: "active", pausedAt: null, nextRunAt },
      { new: true }
    ).lean() as unknown as RecurringScheduleDocument | null;
  }

  async cancel(id: string): Promise<RecurringScheduleDocument | null> {
    await this.connect();
    return RecurringSchedule.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    ).lean() as unknown as RecurringScheduleDocument | null;
  }

  async advanceNextRun(
    id: string,
    nextRunAt: Date
  ): Promise<void> {
    await this.connect();
    await RecurringSchedule.findByIdAndUpdate(id, {
      $inc: { totalRuns: 1 },
      $set: { lastRunAt: new Date(), nextRunAt },
    });
  }

  /** Lock a schedule to a specific provider (auto-set after first completion). */
  async setPreferredProvider(id: string, providerId: string): Promise<void> {
    await this.connect();
    await RecurringSchedule.findByIdAndUpdate(id, { $set: { providerId } });
  }

  /** Partial update of editable schedule fields. */
  async update(
    id: string,
    fields: Partial<{
      title: string;
      description: string;
      budget: number;
      location: string;
      specialInstructions: string;
      maxRuns: number | null;
      autoPayEnabled: boolean;
      providerId: string | null;
    }>
  ): Promise<RecurringScheduleDocument | null> {
    await this.connect();
    return RecurringSchedule.findByIdAndUpdate(
      id,
      { $set: fields },
      { new: true }
    ).lean() as unknown as RecurringScheduleDocument | null;
  }
}

export const recurringScheduleRepository = new RecurringScheduleRepository();
