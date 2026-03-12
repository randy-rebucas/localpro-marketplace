import { Headphones } from "lucide-react";

export default function AdminSupportInboxPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700">
        <Headphones className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Select a conversation</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Choose a user thread from the left to view and reply.</p>
      </div>
    </div>
  );
}

