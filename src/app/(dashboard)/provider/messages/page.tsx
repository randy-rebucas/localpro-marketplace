import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Messages" };

export default function ProviderMessagesPage() {
  return (
    <div className="space-y-4">
      <PageGuide
        pageKey="provider-messages"
        title="How Messages works"
        steps={[
          { icon: "💬", title: "Per-job threads", description: "Each job you're assigned to has its own chat thread with the client." },
          { icon: "👈", title: "Select a thread", description: "Choose a job from the left sidebar to open the conversation with that client." },
          { icon: "📋", title: "Clarify requirements", description: "Use chat to confirm job details, ask questions, or share updates before and during the job." },
          { icon: "🛡️", title: "On-platform protection", description: "Keeping all communication on LocalPro protects you in case of any disputes." },
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
