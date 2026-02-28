import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { messageRepository } from "@/repositories";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };


async function getThreads(providerId: string) {
  const jobs = await jobRepository.findJobsForMessagesProvider(providerId);

  if (jobs.length === 0) return [];

  const threadIds = jobs.map((j) => j._id.toString());
  const previews = await messageRepository.findThreadPreviews(threadIds, providerId);

  const previewMap = new Map(previews.map((p) => [p.threadId, p]));

  return jobs.map((job) => ({
    jobId: job._id.toString(),
    title: job.title,
    status: job.status,
    preview: previewMap.get(job._id.toString()) ?? null,
  }));
}

export default async function ProviderMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const threads = await getThreads(user.userId);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Messages</h1>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No conversations yet. Accept a job to start messaging with clients.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {threads.map(({ jobId, title, preview }) => {
            const lastMsg = preview?.lastMessage;
            const unread = preview?.unreadCount ?? 0;
            return (
              <li key={jobId}>
                <Link
                  href={`/provider/messages/${jobId}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{title}</p>
                    {lastMsg ? (
                      <p className="text-sm text-slate-500 truncate">
                        {String((lastMsg as unknown as Record<string, unknown>).body ?? "")}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No messages yet</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {lastMsg && (
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(new Date(String((lastMsg as unknown as Record<string, unknown>).createdAt ?? "")))}
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
