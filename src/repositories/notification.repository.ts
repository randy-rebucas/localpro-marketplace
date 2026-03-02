import Notification from "@/models/Notification";
import type { NotificationDocument } from "@/models/Notification";
import { BaseRepository } from "./base.repository";

export class NotificationRepository extends BaseRepository<NotificationDocument> {
  constructor() {
    super(Notification);
  }

  async findForUser(userId: string, limit = 30): Promise<NotificationDocument[]> {
    await this.connect();
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as NotificationDocument[];
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.connect();
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { readAt: new Date() }
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.updateMany(
      { userId, readAt: null } as never,
      { readAt: new Date() }
    );
  }

  async countUnread(userId: string): Promise<number> {
    return this.count({ userId, readAt: null } as never);
  }

  /**
   * Returns true if a notification of `type` was already sent to `userId`
   * at or after `since`. Used to throttle repeat reminders.
   */
  async wasRecentlySent(userId: string, type: string, since: Date): Promise<boolean> {
    await this.connect();
    const found = await Notification.findOne({ userId, type, createdAt: { $gte: since } }).lean();
    return !!found;
  }

  /** Delete read notifications older than `before`. Returns the count removed. */
  async pruneRead(before: Date): Promise<number> {
    await this.connect();
    const result = await Notification.deleteMany({
      readAt: { $ne: null, $lt: before },
    });
    return result.deletedCount ?? 0;
  }
}

export const notificationRepository = new NotificationRepository();
