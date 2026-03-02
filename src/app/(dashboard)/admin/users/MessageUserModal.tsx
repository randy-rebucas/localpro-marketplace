"use client";

import { useState } from "react";
import { X, Mail, MessageSquare, Bell, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";

type Channel = "email" | "sms" | "in_app";

interface Props {
  userId: string;
  userName: string;
  hasEmail: boolean;
  hasPhone: boolean;
  onClose: () => void;
}

const CHANNEL_META: {
  key: Channel;
  label: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
}[] = [
  {
    key:         "email",
    label:       "Email",
    description: "Sent to the user's registered email address",
    icon:        Mail,
    iconClass:   "text-blue-600",
  },
  {
    key:         "sms",
    label:       "SMS",
    description: "Text message via Twilio to their phone number",
    icon:        MessageSquare,
    iconClass:   "text-emerald-600",
  },
  {
    key:         "in_app",
    label:       "In-app notification",
    description: "Appears in their notification bell in real time",
    icon:        Bell,
    iconClass:   "text-violet-600",
  },
];

export default function MessageUserModal({ userId, userName, hasEmail, hasPhone, onClose }: Props) {
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [channels, setChannels] = useState<Set<Channel>>(
    new Set(["email", "in_app"] as Channel[])
  );
  const [sending, setSending] = useState(false);

  const available: Set<Channel> = new Set([
    "in_app",
    ...(hasEmail ? ["email" as Channel] : []),
    ...(hasPhone ? ["sms"   as Channel] : []),
  ]);

  function toggleChannel(ch: Channel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) {
        next.delete(ch);
      } else {
        next.add(ch);
      }
      return next;
    });
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required");
      return;
    }
    const selected = [...channels].filter((c) => available.has(c));
    if (selected.length === 0) {
      toast.error("Select at least one delivery channel");
      return;
    }

    setSending(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/message`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subject: subject.trim(), body: body.trim(), channels: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send message");
        return;
      }

      // Report per-channel outcome
      const results: Record<string, string> = data.results ?? {};
      const sent    = Object.entries(results).filter(([, v]) => v === "sent").map(([k]) => k);
      const skipped = Object.entries(results).filter(([, v]) => v === "skipped").map(([k]) => k);

      if (sent.length)    toast.success(`Sent via: ${sent.join(", ")}`);
      if (skipped.length) toast(`Skipped (no contact info): ${skipped.join(", ")}`, { icon: "⚠️" });

      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Message user</h2>
            <p className="text-xs text-slate-500 mt-0.5">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="e.g. Important update about your account"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Write your message here…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
            <p className="text-right text-[10px] text-slate-400 mt-0.5">{body.length}/2000</p>
          </div>

          {/* Channel selectors */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Delivery channels</label>
            <div className="space-y-2">
              {CHANNEL_META.map(({ key, label, description, icon: Icon, iconClass }) => {
                const isAvailable = available.has(key);
                const isSelected  = channels.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => isAvailable && toggleChannel(key)}
                    className={[
                      "w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                      isAvailable
                        ? isSelected
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {/* Checkbox visual */}
                    <span
                      className={[
                        "mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        isSelected && isAvailable
                          ? "border-primary bg-primary"
                          : "border-slate-300",
                      ].join(" ")}
                    >
                      {isSelected && isAvailable && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                          <path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>

                    <Icon size={15} className={`mt-0.5 flex-shrink-0 ${iconClass}`} />

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800">
                        {label}
                        {!isAvailable && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                            (no {key === "sms" ? "phone number" : "email"} on record)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {sending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />}
            {sending ? "Sending…" : "Send message"}
          </button>
        </div>
      </div>
    </div>
  );
}
