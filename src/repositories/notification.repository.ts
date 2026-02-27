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
}

export const notificationRepository = new NotificationRepository();
