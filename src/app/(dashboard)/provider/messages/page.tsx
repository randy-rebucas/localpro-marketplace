import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Messages" };

export default function ProviderMessagesPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8 py-16">
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-slate-100">
        <MessageSquare className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Select a conversation</p>
        <p className="text-xs text-slate-400 mt-1">Choose a thread from the left sidebar to start messaging.</p>
      </div>
    </div>
  );
}
