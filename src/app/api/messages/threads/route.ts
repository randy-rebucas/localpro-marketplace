import { NextResponse } from "next/server";
import { Types } from "mongoose";
import Job from "@/models/Job";
import { messageRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export interface MessageThreadPreview {
  threadId: string;
  jobTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  otherParty: {
    _id: string;
    name: string;
    avatar: string | null;
  };
}

/**
 * GET /api/messages/threads
 *
 * Fetch all message threads for the current user.
 * A thread represents one-on-one messages scoped to a specific job.
 *
 * Returns an array of thread previews with:
 * - threadId (equals jobId)
 * - jobTitle
 * - lastMessage (preview text)
 * - lastMessageAt (ISO timestamp)
 * - unreadCount (messages unread by current user)
 * - otherParty (the other participant: client or provider)
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const userId = new Types.ObjectId(user.userId);

  // Find all jobs where user is either client or provider, with populated user data
  const jobs = (await Job.find({
    $or: [{ clientId: userId }, { providerId: userId }],
  })
    .populate("clientId", "_id name avatar")
    .populate("providerId", "_id name avatar")
    .lean()) as Array<{
    _id: any;
    title: string;
    clientId: { _id: any; name: string; avatar?: string | null };
    providerId: { _id: any; name: string; avatar?: string | null } | null;
  }>;

  if (jobs.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  // Get thread previews for all job IDs
  const threadIds = jobs.map((job) => job._id.toString());
  const threadPreviews = await messageRepository.findThreadPreviews(
    threadIds,
    user.userId
  );

  // Build response with otherParty info from jobs
  const jobMap = new Map(jobs.map((job) => [job._id.toString(), job]));

  const threads = threadPreviews
    .map((preview) => {
      const job = jobMap.get(preview.threadId);
      if (!job) return null;

      // Determine the other party (who is NOT the current user)
      const isClient = job.clientId._id.toString() === user.userId;
      const otherParty = isClient ? job.providerId : job.clientId;

      // If other party is null (provider not assigned yet), skip this thread
      if (!otherParty) return null;

      const lastMessage = preview.lastMessage?.body || "(No messages yet)";
      const lastMessageAt = preview.lastMessage?.createdAt
        ? new Date(preview.lastMessage.createdAt).toISOString()
        : new Date().toISOString();

      return {
        threadId: preview.threadId,
        jobTitle: job.title || "Untitled Job",
        lastMessage:
          lastMessage.length > 100
            ? lastMessage.substring(0, 100) + "..."
            : lastMessage,
        lastMessageAt,
        unreadCount: preview.unreadCount,
        otherParty: {
          _id: otherParty._id.toString(),
          name: otherParty.name || "Unknown",
          avatar: otherParty.avatar || null,
        },
      };
    })
    .filter((thread): thread is MessageThreadPreview => thread !== null)
    // Sort by most recent message first
    .sort((a, b) => {
      return (
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
      );
    });

  return NextResponse.json({ threads });
});
