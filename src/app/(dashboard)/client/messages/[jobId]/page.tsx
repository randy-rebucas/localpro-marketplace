"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetchClient";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 animate-pulse rounded-xl" />
  ),
});

export default function ClientJobChatPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user, router]);

  // Fetch job title for the header
  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/jobs/${jobId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.title) setJobTitle(data.title); })
      .catch(() => {});
  }, [jobId, user]);

  if (!initialized || !user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <Link href="/client/messages" className="text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 truncate">
            {jobTitle ?? "Job Conversation"}
          </h2>
          {jobTitle && (
            <p className="text-xs text-slate-400">Conversation</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatWindow
          fetchUrl={`/api/messages/${jobId}`}
          postUrl={`/api/messages/${jobId}`}
          streamUrl={`/api/messages/stream/${jobId}`}
          currentUserId={String(user._id)}
        />
      </div>
    </div>
  );
}
