"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetchClient";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-slate-100 animate-pulse" />,
});

export default function ProviderJobChatPage({
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

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/jobs/${jobId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.title) setJobTitle(data.title); })
      .catch(() => {});
  }, [jobId, user]);

  if (!initialized || !user) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {jobTitle ?? "Job Conversation"}
        </p>
        <p className="text-xs text-slate-400">Conversation thread</p>
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
