"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { CheckCheck, Check, FileText, Download } from "lucide-react";
import Image from "next/image";

interface MessageBubbleProps {
  body: string;
  senderName: string;
  senderRole?: string;
  createdAt: string | Date;
  isMine: boolean;
  readAt?: string | null;
  /** Message type — 'text' | 'file' | 'system' */
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MessageBubble = memo(function MessageBubble({
  body,
  senderName,
  createdAt,
  isMine,
  readAt,
  type = "text",
  fileUrl,
  fileName,
  fileMime,
  fileSize,
}: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isImage = fileMime?.startsWith("image/") ?? false;

  // ── System messages (auto-generated notes) ──────────────────────────────
  if (type === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{body}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMine ? "self-end items-end" : "self-start items-start")}>
      {!isMine && (
        <span className="text-xs font-medium text-slate-500 px-1">{senderName}</span>
      )}

      {/* ── File attachment ── */}
      {type === "file" && fileUrl ? (
        <div className={cn(
          "rounded-2xl overflow-hidden border",
          isMine ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-white shadow-sm"
        )}>
          {isImage ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={fileUrl}
                alt={fileName ?? "Image"}
                width={240}
                height={180}
                className="block max-w-[240px] object-cover rounded-xl"
              />
            </a>
          ) : (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 group",
                isMine ? "text-primary" : "text-slate-700"
              )}
            >
              <FileText className="h-8 w-8 flex-shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate max-w-[160px]">{fileName ?? body}</p>
                {fileSize && (
                  <p className="text-xs text-slate-400">{formatBytes(fileSize)}</p>
                )}
              </div>
              <Download className="h-4 w-4 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>
      ) : (
        /* ── Regular text message ── */
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
      )}

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
});

export default MessageBubble;
