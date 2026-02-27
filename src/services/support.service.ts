import { messageRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  pushSupportToAdmin,
  pushSupportToUser,
  pushNotification,
} from "@/lib/events";
import { notificationRepository } from "@/repositories";
import { NotFoundError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";

export class SupportService {
  // ─── User side ────────────────────────────────────────────────────────────

  /** Return the support thread for the current user (marks admin messages as read). */
  async getThread(user: TokenPayload) {
    const messages = await messageRepository.findSupportThread(user.userId);
    await messageRepository.markSupportReadForUser(user.userId);
    return messages;
  }

  /** Send a message from a user to the support team. */
  async sendUserMessage(user: TokenPayload, body: string) {
    await connectDB();
    // Find any admin to store as receiverId (required by schema).
    // Fall back to the sender's own ID so the message is still stored even on
    // fresh installs before an admin account has been created.
    const admin = await User.findOne({ role: "admin" }).select("_id").lean() as { _id: { toString(): string } } | null;
    const receiverId = admin ? admin._id.toString() : user.userId;

    const message = await messageRepository.create({
      threadId: `support:${user.userId}`,
      senderId: user.userId,
      receiverId,
      body: body.trim(),
    });

    // Populate senderId so UI can show name
    const populated = await messageRepository.findSupportThread(user.userId, 1)
      .then((msgs) => msgs[msgs.length - 1] ?? message);

    // Push to both buses so the admin inbox updates and any open thread refreshes
    const payload = { ...message, __support: true };
    pushSupportToAdmin({ userId: user.userId, message: payload });
    pushSupportToUser(user.userId, payload);

    return populated;
  }

  // ─── Admin side ───────────────────────────────────────────────────────────

  /** Return a specific user's support thread. Admin opens it → mark user messages as read. */
  async getThreadForAdmin(targetUserId: string) {
    const user = await User.findById(targetUserId).select("name email role").lean();
    if (!user) throw new NotFoundError("User");

    const messages = await messageRepository.findSupportThread(targetUserId);
    await messageRepository.markSupportReadForAdmin(targetUserId);
    return { user, messages };
  }

  /** Admin sends a reply to a user's support thread. */
  async adminReply(admin: TokenPayload, targetUserId: string, body: string) {
    const targetUser = await User.findById(targetUserId).select("_id name").lean() as { _id: { toString(): string }; name: string } | null;
    if (!targetUser) throw new NotFoundError("User");

    const message = await messageRepository.create({
      threadId: `support:${targetUserId}`,
      senderId: admin.userId,
      receiverId: targetUserId,
      body: body.trim(),
    });

    const payload = { ...message, __support: true };
    // User sees the reply in their support chat
    pushSupportToUser(targetUserId, payload);
    // Admin inbox also updates
    pushSupportToAdmin({ userId: targetUserId, message: payload });

    // In-app notification for the user
    const notification = await notificationRepository.create({
      userId: targetUserId,
      type: "new_message",
      title: "Support reply",
      message: body.slice(0, 80) + (body.length > 80 ? "…" : ""),
      data: {},
    });
    pushNotification(targetUserId, notification);

    return message;
  }

  /** List all support threads for the admin inbox. */
  async listThreads() {
    const summaries = await messageRepository.listSupportThreadSummaries();

    if (summaries.length === 0) return [];

    await connectDB();
    const userIds = summaries.map((s) => s.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email role")
      .lean() as { _id: { toString(): string }; name: string; email: string; role: string }[];

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return summaries.map((s) => ({
      ...s,
      user: userMap.get(s.userId) ?? null,
    }));
  }
}

export const supportService = new SupportService();
