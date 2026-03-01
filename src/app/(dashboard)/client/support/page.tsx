"use client";

import dynamic from "next/dynamic";
import { useAuthStore } from "@/stores/authStore";
import { Headphones } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 animate-pulse rounded-xl" />
  ),
});

export default function ClientSupportPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

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
      <ChatWindow
        fetchUrl="/api/support"
        postUrl="/api/support"
        streamUrl="/api/support/stream"
        currentUserId={String(user._id)}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Support Team</p>
              <p className="text-xs text-slate-500">We typically respond within a few hours</p>
            </div>
          </div>
        }
        emptyMessage="Send us a message and our support team will get back to you."
      />
    </div>
  );
}
