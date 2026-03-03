"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronLeft, Briefcase, User2 } from "lucide-react";
import type { JobStatus } from "@/types";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex flex-col gap-3 p-4 animate-pulse">
      {[..."llrllrll"].map((side, i) => (
        <div key={i} className={`flex ${side === "r" ? "justify-end" : "justify-start"}`}>
          <div className={`h-9 rounded-2xl bg-slate-200 ${side === "r" ? "w-48" : "w-56"}`} />
        </div>
      ))}
    </div>
  ),
});

interface Props {
  jobId: string;
  title: string;
  status: JobStatus;
  providerName: string | null;
  currentUserId: string;
}

export default function ChatPanel({ jobId, title, status, providerName, currentUserId }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Thread header */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/client/messages"
            className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              {title}
            </p>
            {providerName && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <User2 className="h-3 w-3" />
                {providerName}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
            {status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ChatWindow
          fetchUrl={`/api/messages/${jobId}`}
          postUrl={`/api/messages/${jobId}`}
          attachUrl={`/api/messages/${jobId}/attachment`}
          streamUrl={`/api/messages/stream/${jobId}`}
          currentUserId={currentUserId}
          currentUserRole="client"
          jobTitle={title}
          jobStatus={status}
        />
      </div>
    </div>
  );
}
