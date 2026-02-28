import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Messages" };

export default function ProviderMessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8 text-center">
      <MessageSquare className="h-12 w-12 opacity-20" />
      <p className="text-sm font-medium text-slate-500">Select a conversation</p>
      <p className="text-xs text-slate-400">Choose a thread from the left to start messaging.</p>
    </div>
  );
}
