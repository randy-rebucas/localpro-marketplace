"use client";

import { cn } from "@/lib/utils";
import { CheckCheck, Check } from "lucide-react";

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderRole?: string;
  createdAt: string | Date;
  isMine: boolean;
  readAt?: string | null;
}

export default function MessageBubble({
  body,
  senderName,
  createdAt,
  isMine,
  readAt,
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
      <div className={cn("flex items-center gap-1 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
        <span className="text-[11px] text-slate-400">{time}</span>
        {isMine && (
          readAt
            ? <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Read" />
            : <Check className="h-3.5 w-3.5 text-slate-400" aria-label="Sent" />
        )}
      </div>
    </div>
  );
}
