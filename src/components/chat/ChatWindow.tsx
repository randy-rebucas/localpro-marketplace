"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { PageLoader } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/fetchClient";

interface RawMessage {
  _id: string;
  body: string;
  createdAt: string;
  senderId: { _id: string; name: string; role: string } | string;
  readAt?: string | null;
}

interface ChatWindowProps {
  /** URL to GET existing messages */
  fetchUrl: string;
  /** URL to POST a new message `{ body }` */
  postUrl: string;
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
}

export default function ChatWindow({
  fetchUrl,
  postUrl,
  streamUrl,
  currentUserId,
  header,
  emptyMessage = "No messages yet. Start the conversation!",
  transformResponse,
  streamTransform,
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

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
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

        {!loading && !error && messages.map((msg) => {
          const isMine = getSenderId(msg) === currentUserId;
          return (
            <MessageBubble
              key={msg._id}
              body={msg.body}
              senderName={getSenderName(msg)}
              senderRole={getSenderRole(msg)}
              createdAt={msg.createdAt}
              isMine={isMine}
              readAt={msg.readAt}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  );
}
