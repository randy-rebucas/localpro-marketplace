"use client";

import { useEffect, useRef, useState, useCallback, Fragment } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ChatChecklist from "./ChatChecklist";
import ChatScopePanel from "./ChatScopePanel";
import { PageLoader } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/fetchClient";
import toast from "react-hot-toast";

interface RawMessage {
  _id: string;
  body: string;
  createdAt: string;
  senderId: { _id: string; name: string; role: string } | string;
  readAt?: string | null;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
}

interface ChatWindowProps {
  /** URL to GET existing messages */
  fetchUrl: string;
  /** URL to POST a new message `{ body }` */
  postUrl: string;
  /** Base URL for file attachments, e.g. `/api/messages/<threadId>/attachment` */
  attachUrl?: string;
  /** SSE URL for real-time updates (optional) */
  streamUrl?: string;
  /** The current user's ID — used to decide which side a bubble appears on */
  currentUserId: string;
  /** Optional header content rendered above the message list */
  header?: React.ReactNode;
  emptyMessage?: string;
  /** Extract messages from a non-array fetch response (e.g. `{ messages, user }`) */
  transformResponse?: (data: unknown) => RawMessage[];
  /** Transform/filter an SSE event before adding to list. Return null to skip the event. */
  streamTransform?: (data: unknown) => RawMessage | null;
  /** Current user's role ("client" | "provider") — enables AI quick reply suggestions */
  currentUserRole?: string;
  /** Job title — used to give context to AI reply suggestions */
  jobTitle?: string;
  /** Current job status — shows pre-job checklist when "assigned" */
  jobStatus?: string;
}

const SAME_GROUP_GAP_MS = 5 * 60 * 1000; // 5 minutes

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function ChatWindow({
  fetchUrl,
  postUrl,
  attachUrl,
  streamUrl,
  currentUserId,
  header,
  emptyMessage = "No messages yet. Start the conversation!",
  transformResponse,
  streamTransform,
  currentUserRole,
  jobTitle,
  jobStatus,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(fetchUrl)
      .then(async (r) => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? `Failed to load messages (${r.status})`);
        }
        return r.json();
      })
      .then((data: unknown) => {
        const msgs = transformResponse ? transformResponse(data) : (data as RawMessage[]);
        setMessages(msgs);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [fetchUrl, transformResponse]);

  // Scroll on initial load
  useEffect(() => {
    if (!loading) scrollToBottom("instant" as ScrollBehavior);
  }, [loading]);

  // SSE real-time updates
  useEffect(() => {
    if (!streamUrl) return;
    const es = new EventSource(streamUrl);

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;
        if (raw.type === "connected") return;

        const msg = streamTransform ? streamTransform(raw) : (raw as unknown as RawMessage);
        if (!msg || !msg._id) return;

        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 50);
      } catch {}
    };

    return () => es.close();
  }, [streamUrl, streamTransform]);

  const handleSend = useCallback(async (body: string) => {
    const res = await apiFetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(errData.error ?? `Failed to send (${res.status})`);
    }
    const msg = await res.json() as RawMessage;
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => scrollToBottom(), 50);
  }, [postUrl]);

  const handleAttach = useCallback(async (file: File) => {
    if (!attachUrl) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch(attachUrl, { method: "POST", body: formData });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(errData.error ?? "Upload failed");
    }
    const msg = await res.json() as RawMessage;
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
    toast.success("File sent!");
    setTimeout(() => scrollToBottom(), 50);
  }, [attachUrl]);

  const getSenderId = (msg: RawMessage) =>
    typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id;

  const getSenderName = (msg: RawMessage) =>
    typeof msg.senderId === "string" ? "Unknown" : msg.senderId.name;

  const getSenderRole = (msg: RawMessage) =>
    typeof msg.senderId === "string" ? "" : msg.senderId.role;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {header && (
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3">
          {header}
        </div>
      )}

      {/* Pre-job checklist — only shown when job is assigned (pre-work) */}
      {jobStatus === "assigned" && currentUserRole && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200">
          <ChatChecklist role={currentUserRole as "client" | "provider"} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <PageLoader />
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">{emptyMessage}</p>
        )}

        {!loading && !error && messages.map((msg, i) => {
          const isMine = getSenderId(msg) === currentUserId;
          const isSystem = msg.type === "system";

          const prev = i > 0 ? messages[i - 1] : null;
          const next = i < messages.length - 1 ? messages[i + 1] : null;

          const sameSenderPrev = !isSystem && prev && prev.type !== "system" &&
            getSenderId(prev) === getSenderId(msg) &&
            (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < SAME_GROUP_GAP_MS;
          const sameSenderNext = !isSystem && next && next.type !== "system" &&
            getSenderId(next) === getSenderId(msg) &&
            (new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime()) < SAME_GROUP_GAP_MS;

          const isFirst = !sameSenderPrev;
          const isLast  = !sameSenderNext;

          const msgDate  = new Date(msg.createdAt);
          const prevDate = prev ? new Date(prev.createdAt) : null;
          const showSep  = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

          return (
            <Fragment key={msg._id}>
              {showSep && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDateSeparator(msgDate)}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              <MessageBubble
                body={msg.body}
                senderName={getSenderName(msg)}
                senderRole={getSenderRole(msg)}
                createdAt={msg.createdAt}
                isMine={isMine}
                readAt={msg.readAt}
                type={msg.type}
                fileUrl={msg.fileUrl}
                fileName={msg.fileName}
                fileMime={msg.fileMime}
                fileSize={msg.fileSize}
                isFirst={isFirst}
                isLast={isLast}
              />
            </Fragment>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* AI scope summary panel */}
      {!loading && messages.length > 1 && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 pt-2 pb-1">
          <ChatScopePanel messages={messages} jobTitle={jobTitle} />
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        onAttach={attachUrl ? handleAttach : undefined}
        aiSuggestData={currentUserRole ? {
          lastMessages: messages.slice(-5).map((m) => ({
            body: m.body,
            senderRole: getSenderRole(m) || currentUserRole,
          })),
          role: currentUserRole,
          jobTitle,
        } : undefined}
      />
    </div>
  );
}
