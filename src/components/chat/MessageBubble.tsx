"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderRole?: string;
  createdAt: string | Date;
  isMine: boolean;
}

export default function MessageBubble({
  body,
  senderName,
  createdAt,
  isMine,
}: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMine ? "self-end items-end" : "self-start items-start")}>
      {!isMine && (
        <span className="text-xs font-medium text-slate-500 px-1">{senderName}</span>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isMine
            ? "bg-primary text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
        )}
      >
        {body}
      </div>
      <span className="text-[11px] text-slate-400 px-1">{time}</span>
    </div>
  );
}
