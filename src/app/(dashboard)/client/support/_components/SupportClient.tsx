"use client";

import dynamic from "next/dynamic";
import { Headphones, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 animate-pulse rounded-xl" />
  ),
});

const INFO_CHIPS = [
  { icon: <Clock className="h-3 w-3" />, text: "Mon–Sat, 8 am–6 pm" },
  { icon: <Headphones className="h-3 w-3" />, text: "Reply within a few hours" },
  { icon: <ShieldCheck className="h-3 w-3" />, text: "Disputes & payment issues supported" },
];

export default function SupportClient({ userId }: { userId: string }) {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <PageGuide
        pageKey="client-support"
        title="How Support works"
        steps={[
          { icon: "🎧", title: "Chat with support", description: "Send a message below and our support team will get back to you as soon as possible." },
          { icon: "⏱️", title: "Response times", description: "We typically respond within a few hours during business hours (Mon–Sat, 8am–6pm)." },
          { icon: "🔍", title: "Report issues", description: "Having trouble with a job or payment? Describe the problem clearly and include relevant job IDs." },
          { icon: "📋", title: "Disputes handled here", description: "For payment disputes, our team can escalate and involve both parties to reach a fair resolution." },
        ]}
      />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Support</h2>
          <p className="text-slate-500 text-sm mt-1">Chat with our team for help with jobs, payments, or disputes.</p>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-2">
        {INFO_CHIPS.map((chip, i) => (
          <div key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
            <span className="text-slate-400">{chip.icon}</span>
            {chip.text}
          </div>
        ))}
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          For faster help, include the <strong>Job ID</strong> and a brief description of the issue in your first message.
        </p>
      </div>

      <ChatWindow
        fetchUrl="/api/support"
        postUrl="/api/support"
        streamUrl="/api/support/stream"
        attachUrl="/api/support/attachment"
        currentUserId={userId}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">LocalPro Support</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online · Mon–Sat, 8 am–6 pm
              </span>
            </div>
          </div>
        }
        emptyMessage="Send us a message and our support team will get back to you shortly."
      />
    </div>
  );
}
