import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Messages" };

export default function ClientMessagesPage() {
  return (
    <div className="space-y-4">
      <PageGuide
        pageKey="client-messages"
        title="How Messages works"
        steps={[
          { icon: "💬", title: "Per-job threads", description: "Each job you have with an assigned provider gets its own chat thread." },
          { icon: "👈", title: "Select a thread", description: "Choose a job from the left sidebar to open that conversation." },
          { icon: "📸", title: "Share photos", description: "You can send messages and photos to clarify job requirements during the work." },
          { icon: "📜", title: "Full history", description: "All messages are saved — you can scroll back to review the full conversation at any time." },
        ]}
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8 text-center">
        <MessageSquare className="h-12 w-12 opacity-20" />
        <p className="text-sm font-medium text-slate-500">Select a conversation</p>
        <p className="text-xs text-slate-400">Choose a thread from the left to start messaging.</p>
      </div>
    </div>
  );
}

