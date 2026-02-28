import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import { messageRepository } from "@/repositories";
import type { JobStatus } from "@/types";
import RealtimeRefresher from "@/components/shared/RealtimeRefresher";
import ProviderMessagesShell from "./ProviderMessagesShell";

async function getThreads(providerId: string) {
  const jobs = await jobRepository.findJobsForMessagesProvider(providerId);
  if (jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j._id.toString());
  const previews = await messageRepository.findThreadPreviews(jobIds, providerId);
  const previewMap = new Map(previews.map((p) => [p.threadId, p]));

  return jobs.map((job) => {
    const p = previewMap.get(job._id.toString());
    const lastMsg = p?.lastMessage ?? null;
    const lastSender =
      lastMsg && typeof lastMsg.senderId === "object" && lastMsg.senderId
        ? (lastMsg.senderId as { name?: string }).name ?? null
        : null;

    return {
      jobId: job._id.toString(),
      title: job.title,
      status: job.status as JobStatus,
      unreadCount: p?.unreadCount ?? 0,
      lastBody: lastMsg?.body ?? null,
      lastSender,
      lastAt: lastMsg ? String(lastMsg.createdAt) : null,
    };
  });
}

export default async function ProviderMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const threads = await getThreads(user.userId);

  return (
    <>
      <RealtimeRefresher entity="message" />
      <ProviderMessagesShell threads={threads}>{children}</ProviderMessagesShell>
    </>
  );
}
