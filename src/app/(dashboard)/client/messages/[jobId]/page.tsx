import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { jobRepository } from "@/repositories/job.repository";
import type { JobStatus } from "@/types";
import ChatPanel from "./_components/ChatPanel";

export default async function ClientJobChatPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const job = await jobRepository.findByIdPopulated(jobId);
  if (!job) notFound();

  const provider = job.providerId as { name?: string } | null;

  return (
    <ChatPanel
      jobId={jobId}
      title={job.title}
      status={job.status as JobStatus}
      providerName={provider?.name ?? null}
      currentUserId={user.userId}
    />
  );
}
