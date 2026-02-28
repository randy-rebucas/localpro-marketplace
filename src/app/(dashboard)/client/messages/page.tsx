import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { messageRepository } from "@/repositories";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { JobStatusBadge } from "@/components/ui/Badge";
import type { JobStatus } from "@/types";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";

export const metadata: Metadata = { title: "Messages" };

async function getThreads(clientId: string) {
  const jobs = await jobRepository.findJobsForMessagesClient(clientId);
  if (jobs.length === 0) return [];

  const threadIds = jobs.map((j) => j._id.toString());
  const previews = await messageRepository.findThreadPreviews(threadIds, clientId);
  const previewMap = new Map(previews.map((p) => [p.threadId, p]));

  return jobs.map((job) => ({
    jobId: job._id.toString(),
    title: job.title,
    status: job.status as JobStatus,
    preview: previewMap.get(job._id.toString()) ?? null,
  }));
}

export default async function ClientMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const threads = await getThreads(user.userId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <RealtimeRefresher entity="message" />
      <h1 className="text-2xl font-bold text-slate-800">Messages</h1>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No conversations yet. Messages appear once a provider is assigned to your job.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {threads.map(({ jobId, title, status, preview }) => {
            const lastMsg = preview?.lastMessage;
            const unread = preview?.unreadCount ?? 0;
            const senderName = lastMsg && typeof lastMsg.senderId === "object" && lastMsg.senderId
              ? (lastMsg.senderId as { name?: string }).name ?? ""
              : "";
            const previewText = lastMsg
              ? `${senderName ? senderName + ": " : ""}${lastMsg.body}`
              : null;
            return (
              <li key={jobId}>
                <Link
                  href={`/client/messages/${jobId}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-slate-800 truncate">{title}</p>
                      <JobStatusBadge status={status} />
                    </div>
                    {previewText ? (
                      <p className="text-sm text-slate-500 truncate">{previewText}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No messages yet</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {lastMsg && (
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(new Date(lastMsg.createdAt as unknown as string))}
                      </span>
                    )}
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold">
                        {unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
