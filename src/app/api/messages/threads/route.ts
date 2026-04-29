import { NextRequest, NextResponse } from "next/server";
import { jobRepository, messageRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

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

const PAGE_LIMIT = 30;

/**
 * GET /api/messages/threads?page=1
 *
 * Fetch paginated message threads for the current user.
 * A thread represents one-on-one messages scoped to a specific job.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`message-threads:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_LIMIT;

  const jobs = await jobRepository.findForMessageThreads(user.userId, PAGE_LIMIT, skip);

  if (jobs.length === 0) {
    return NextResponse.json({ threads: [], page, hasMore: false });
  }

  const threadIds = jobs.map((job) => job._id.toString());
  const threadPreviews = await messageRepository.findThreadPreviews(threadIds, user.userId);

  const jobMap = new Map(jobs.map((job) => [job._id.toString(), job]));

  const threads = threadPreviews
    .map((preview) => {
      const job = jobMap.get(preview.threadId);
      if (!job) return null;

      const isClient = job.clientId._id.toString() === user.userId;
      const otherParty = isClient ? job.providerId : job.clientId;

      // Skip threads where provider isn't assigned yet
      if (!otherParty) return null;

      const lastMessage = preview.lastMessage?.body || "(No messages yet)";
      // Fall back to job creation time so un-messaged threads sort below active ones
      const lastMessageAt = preview.lastMessage?.createdAt
        ? new Date(preview.lastMessage.createdAt).toISOString()
        : new Date(job.createdAt).toISOString();

      return {
        threadId: preview.threadId,
        jobTitle: job.title || "Untitled Job",
        lastMessage: lastMessage.length > 100 ? lastMessage.substring(0, 100) + "…" : lastMessage,
        lastMessageAt,
        unreadCount: preview.unreadCount,
        otherParty: {
          _id: otherParty._id.toString(),
          name: otherParty.name || "Unknown",
          avatar: (otherParty as { avatar?: string | null }).avatar || null,
        },
      };
    })
    .filter((t): t is MessageThreadPreview => t !== null)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json({ threads, page, hasMore: jobs.length === PAGE_LIMIT });
});
