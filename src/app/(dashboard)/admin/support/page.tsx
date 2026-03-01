import { Headphones } from "lucide-react";

export default function AdminSupportInboxPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8 text-center">
      <Headphones className="h-12 w-12 opacity-20" />
      <p className="text-sm font-medium text-slate-500">Select a conversation</p>
      <p className="text-xs text-slate-400">Choose a user thread from the left to view and reply.</p>
    </div>
  );
}

