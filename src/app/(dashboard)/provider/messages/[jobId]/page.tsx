import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import type { JobStatus } from "@/types";
import ChatPanel from "./_components/ChatPanel";

export default async function ProviderJobChatPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const job = await jobRepository.findByIdPopulated(jobId);
  if (!job) notFound();

  return (
    <ChatPanel
      jobId={jobId}
      title={job.title}
      status={job.status as JobStatus}
      currentUserId={user.userId}
    />
  );
}
