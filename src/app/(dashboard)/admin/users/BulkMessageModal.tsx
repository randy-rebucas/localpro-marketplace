"use client";

import { useState } from "react";
import { X, MessageSquare, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";

const CHANNELS = [
  { value: "in_app", label: "In-app notification" },
  { value: "email",  label: "Email" },
  { value: "sms",    label: "SMS" },
] as const;

type Channel = (typeof CHANNELS)[number]["value"];

interface Props {
  selectedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkMessageModal({ selectedIds, onClose, onSuccess }: Props) {
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [channels, setChannels] = useState<Set<Channel>>(new Set(["in_app"]));
  const [sending,  setSending]  = useState(false);

  function toggleChannel(ch: Channel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) { if (next.size > 1) next.delete(ch); }
      else next.add(ch);
      return next;
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch("/api/admin/users/bulk/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          subject: subject.trim(),
          body: body.trim(),
          channels: [...channels],
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send message"); return; }
      toast.success(`Message sent to ${data.total} user${data.total !== 1 ? "s" : ""}.`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Message Users</h2>
              <p className="text-xs text-slate-400">
                Sending to {selectedIds.length} selected user{selectedIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="px-6 py-5 space-y-4">
          {/* Channels */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Send via
            </label>
            <div className="flex gap-2 flex-wrap">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => toggleChannel(ch.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    channels.has(ch.value)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Subject / Title
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Important platform update"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={2}
              maxLength={2000}
              rows={5}
              placeholder="Write your message here…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              {channels.has("sms") ? (() => {
                const smsText = `[LocalPro] ${subject}\n\n${body}`;
                const segs = Math.ceil(smsText.length / 160) || 1;
                return (
                  <p className={`text-[11px] tabular-nums ${segs > 1 ? "text-amber-500" : "text-slate-400"}`}>
                    SMS: {smsText.length} chars · {segs} segment{segs !== 1 ? "s" : ""}
                  </p>
                );
              })() : <span />}
              <p className="text-[11px] text-slate-400 tabular-nums">{body.length}/2000</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><MessageSquare className="h-3.5 w-3.5" /> Send message</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
