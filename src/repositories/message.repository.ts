import Message from "@/models/Message";
import type { MessageDocument } from "@/models/Message";
import { BaseRepository } from "./base.repository";

export interface ThreadPreview {
  threadId: string;
  lastMessage: MessageDocument | null;
  unreadCount: number;
}

export interface SupportThreadSummary {
  threadId: string;
  userId: string;
  lastMessage: Record<string, unknown>;
  unreadForAdmin: number;
}

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

  // ─── Job Thread Previews ─────────────────────────────────────────────────

  /** Fetch the latest message + unread count for each given job thread. */
  async findThreadPreviews(
    threadIds: string[],
    currentUserId: string
  ): Promise<ThreadPreview[]> {
    if (threadIds.length === 0) return [];
    await this.connect();

    return Promise.all(
      threadIds.map(async (threadId) => {
        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({ threadId })
            .populate("senderId", "name role")
            .sort({ createdAt: -1 })
            .lean() as unknown as MessageDocument | null,
          Message.countDocuments({
            threadId,
            receiverId: currentUserId,
            readAt: null,
          }),
        ]);
        return { threadId, lastMessage, unreadCount };
      })
    );
  }

  // ─── Support Threads ─────────────────────────────────────────────────────

  async findSupportThread(userId: string, limit = 100): Promise<MessageDocument[]> {
    await this.connect();
    return Message.find({ threadId: `support:${userId}` })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean() as unknown as MessageDocument[];
  }

  async markSupportReadForUser(userId: string): Promise<void> {
    await this.connect();
    await Message.updateMany(
      { threadId: `support:${userId}`, receiverId: userId, readAt: null },
      { readAt: new Date() }
    );
  }

  async markSupportReadForAdmin(userId: string): Promise<void> {
    await this.connect();
    await Message.updateMany(
      { threadId: `support:${userId}`, senderId: userId, readAt: null },
      { readAt: new Date() }
    );
  }

  async listSupportThreadSummaries(): Promise<SupportThreadSummary[]> {
    await this.connect();
    const results = await Message.aggregate([
      { $match: { threadId: { $regex: /^support:/ } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$threadId",
          lastMessage: { $first: "$$ROOT" },
          unreadForAdmin: {
            $sum: { $cond: [{ $eq: ["$readAt", null] }, 1, 0] },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    return results.map((r) => ({
      threadId: r._id as string,
      userId: (r._id as string).replace("support:", ""),
      lastMessage: r.lastMessage as Record<string, unknown>,
      unreadForAdmin: r.unreadForAdmin as number,
    }));
  }

  async countUnreadSupportForAdmin(): Promise<number> {
    await this.connect();
    return Message.countDocuments({
      threadId: { $regex: /^support:/ },
      readAt: null,
    });
  }
}

export const messageRepository = new MessageRepository();
