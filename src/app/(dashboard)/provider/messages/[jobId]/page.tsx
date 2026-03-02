"use client";

import { use, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useThreadMeta } from "@/components/chat/MessagesContext";
import { ChevronLeft, Briefcase } from "lucide-react";
import Link from "next/link";
import { JobStatusBadge } from "@/components/ui/Badge";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-slate-50 animate-pulse" />,
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

  // Title & status come instantly from context (loaded by layout)
  const thread = useThreadMeta(jobId);

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user, router]);

  if (!initialized || !user) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/provider/messages"
            className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              {thread?.title ?? "Loading…"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Client conversation</p>
          </div>
          {thread?.status && (
            <JobStatusBadge status={thread.status} />
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ChatWindow
          fetchUrl={`/api/messages/${jobId}`}
          postUrl={`/api/messages/${jobId}`}
          attachUrl={`/api/messages/${jobId}/attachment`}
          streamUrl={`/api/messages/stream/${jobId}`}
          currentUserId={String(user._id)}
          currentUserRole="provider"
          jobTitle={thread?.title}
          jobStatus={thread?.status}
        />
      </div>
    </div>
  );
}
