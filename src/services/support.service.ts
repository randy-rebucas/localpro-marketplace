import { messageRepository, userRepository, notificationRepository } from "@/repositories";
import {
  pushSupportToAdmin,
  pushSupportToUser,
  pushNotification,
} from "@/lib/events";
import { maskContactInfo } from "@/lib/contactFilter";
import { NotFoundError } from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import { AIDecisionService } from "@/services/ai-decision.service";
import { connectDB } from "@/lib/db";

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
    // Find any admin to store as receiverId (required by schema).
    // Fall back to the sender's own ID so the message is still stored even on
    // fresh installs before an admin account has been created.
    const admin = await userRepository.findAdmin();
    const receiverId = admin ? admin._id.toString() : user.userId;

    const message = await messageRepository.create({
      threadId: `support:${user.userId}`,
      senderId: user.userId,
      receiverId,
      body: maskContactInfo(body.trim()),
    });

    // Populate before pushing so real-time listeners receive name/role on senderId
    const populated = await messageRepository.findByIdPopulated(
      (message._id as { toString(): string }).toString()
    );

    const payload = { ...(populated ?? message), __support: true };
    pushSupportToAdmin({ userId: user.userId, message: payload });
    pushSupportToUser(user.userId, payload);

    // Try to analyze with AI agent (non-blocking - if fails, just continue)
    this.analyzeAndRespondWithAI(user, body, (message._id as any)?.toString()).catch(
      (err) => console.error("[SupportService] AI analysis failed (non-blocking):", err)
    );

    return populated ?? message;
  }

  /**
   * Analyze support message with AI agent and auto-reply if confident
   * This runs asynchronously and doesn't block the message creation
   */
  private async analyzeAndRespondWithAI(
    user: TokenPayload,
    message: string,
    messageId: string
  ) {
    try {
      await connectDB();

      // Call AI Support Agent API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${appUrl}/api/ai/agents/support-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`, // Use internal key
        },
        body: JSON.stringify({
          userId: user.userId,
          message: message,
          category: this.detectCategory(message),
          previousMessages: [], // First message
        }),
      });

      if (!response.ok) {
        console.warn("[SupportService] AI agent returned non-OK status:", response.status);
        return;
      }

      const aiResult = await response.json();

      // Queue all support messages for manual review via founder dashboard
      // The AI recommendation helps the support team make faster decisions
      console.log(
        `[SupportService] AI support message ${messageId} analysis complete (confidence: ${aiResult.decision?.confidence}%, risk: ${aiResult.decision?.riskLevel})`
      );
    } catch (error) {
      console.error("[SupportService] AI support analysis failed:", error);
      // Silently fail - message was already created and sent to admin
    }
  }

  /**
   * Detect support category from message content
   */
  private detectCategory(message: string): string {
    const lowerMsg = message.toLowerCase();

    if (
      lowerMsg.includes("payment") ||
      lowerMsg.includes("charge") ||
      lowerMsg.includes("bill")
    ) {
      return "billing";
    }
    if (
      lowerMsg.includes("account") ||
      lowerMsg.includes("password") ||
      lowerMsg.includes("login")
    ) {
      return "account";
    }
    if (
      lowerMsg.includes("dispute") ||
      lowerMsg.includes("disagree") ||
      lowerMsg.includes("issue")
    ) {
      return "dispute";
    }
    if (
      lowerMsg.includes("technical") ||
      lowerMsg.includes("bug") ||
      lowerMsg.includes("error")
    ) {
      return "technical";
    }
    if (lowerMsg.includes("kyc") || lowerMsg.includes("verification")) {
      return "kyc";
    }
    if (lowerMsg.includes("payout") || lowerMsg.includes("withdrawal")) {
      return "payout";
    }
    return "other";
  }

  // ─── Admin side ───────────────────────────────────────────────────────────

  /** Return a specific user's support thread. Admin opens it → mark user messages as read. */
  async getThreadForAdmin(targetUserId: string) {
    const user = await userRepository.findById(targetUserId);
    if (!user) throw new NotFoundError("User");

    const messages = await messageRepository.findSupportThread(targetUserId);
    await messageRepository.markSupportReadForAdmin(targetUserId);
    return { user, messages };
  }

  /** Admin sends a reply to a user's support thread. */
  async adminReply(admin: TokenPayload, targetUserId: string, body: string) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) throw new NotFoundError("User");

    const message = await messageRepository.create({
      threadId: `support:${targetUserId}`,
      senderId: admin.userId,
      receiverId: targetUserId,
      body: maskContactInfo(body.trim()),
    });

    // Populate before pushing so real-time listeners receive name/role on senderId
    const populated = await messageRepository.findByIdPopulated(
      (message._id as { toString(): string }).toString()
    );

    const payload = { ...(populated ?? message), __support: true };
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

    return populated ?? message;
  }

  /** List all support threads for the admin inbox. */
  async listThreads() {
    const summaries = await messageRepository.listSupportThreadSummaries();

    if (summaries.length === 0) return [];

    const userIds = summaries.map((s) => s.userId);
    const users = await userRepository.findByIds(userIds);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return summaries.map((s) => ({
      ...s,
      user: userMap.get(s.userId) ?? null,
    }));
  }
}

export const supportService = new SupportService();
