"use client";

import { use } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ClientJobChatPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <Link href="/client/messages" className="text-slate-500 hover:text-slate-800 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-sm font-semibold text-slate-800">Job Conversation</h2>
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
