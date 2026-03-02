"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, FileText, ListChecks, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import toast from "react-hot-toast";

interface ScopeResult {
  summary: string;
  agreements: string[];
  nextSteps: string[];
}

interface RawMessage {
  body: string;
  senderId: { role?: string } | string;
  type?: string;
}

interface Props {
  messages: RawMessage[];
  jobTitle?: string;
}

function getSenderRole(msg: RawMessage): string {
  if (typeof msg.senderId === "string") return "user";
  return msg.senderId?.role ?? "user";
}

export default function ChatScopePanel({ messages, jobTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScopeResult | null>(null);

  const textMessages = messages.filter((m) => !m.type || m.type === "text");

  const generate = async () => {
    if (loading) return;
    if (textMessages.length < 2) {
      toast.error("Need at least 2 messages to generate a summary.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/ai/summarize-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: textMessages.slice(-40).map((m) => ({
            body: m.body,
            senderRole: getSenderRole(m),
          })),
          jobTitle,
        }),
      });
      const data = await res.json() as ScopeResult & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not generate summary.");
        return;
      }
      setResult(data);
      setOpen(true);
    } catch {
      toast.error("Failed to reach AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-4 mb-2">
      {/* Trigger button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!result) {
              generate();
            } else {
              setOpen((o) => !o);
            }
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors disabled:opacity-50"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Generating summary…" : result ? "View Scope Summary" : "AI Scope Summary"}
          {result && (open
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />)}
        </button>
        {result && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="text-[10px] text-slate-400 hover:text-violet-600 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Result panel */}
      {result && open && (
        <div className="mt-2 rounded-xl border border-violet-200 bg-white shadow-sm overflow-hidden text-sm">
          {/* Summary */}
          <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-start gap-2">
            <FileText className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-violet-900 leading-relaxed">{result.summary}</p>
          </div>

          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Agreements */}
            {result.agreements.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ListChecks className="h-3.5 w-3.5" /> Agreements
                </p>
                <ul className="space-y-1.5">
                  {result.agreements.map((a, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-700">
                      <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {result.nextSteps.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ArrowRight className="h-3.5 w-3.5" /> Next Steps
                </p>
                <ul className="space-y-1.5">
                  {result.nextSteps.map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-700">
                      <span className="text-blue-400 font-bold flex-shrink-0 mt-0.5">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              AI-generated summary based on your conversation. Always verify details directly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
