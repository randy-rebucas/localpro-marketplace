import Message from "@/models/Message";
import type { MessageDocument } from "@/models/Message";
import { BaseRepository } from "./base.repository";

export class MessageRepository extends BaseRepository<MessageDocument> {
  constructor() {
    super(Message);
  }

  async findThread(threadId: string, limit = 50): Promise<MessageDocument[]> {
    await this.connect();
    return Message.find({ threadId })
      .populate("senderId", "name role")
      .populate("receiverId", "name role")
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean() as unknown as MessageDocument[];
  }

  async markThreadRead(threadId: string, userId: string): Promise<void> {
    await this.updateMany(
      { threadId, receiverId: userId, readAt: null } as never,
      { readAt: new Date() }
    );
  }

  async countUnreadForUser(userId: string): Promise<number> {
    return this.count({ receiverId: userId, readAt: null } as never);
  }
}

export const messageRepository = new MessageRepository();
