import type { Metadata } from "next";
import { MessageSquare, ArrowLeft, ImagePlus, History } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Messages" };

const TIPS = [
  { icon: <MessageSquare className="h-4 w-4" />, text: "Each job with an assigned provider gets its own thread." },
  { icon: <ImagePlus className="h-4 w-4" />, text: "You can attach photos to clarify requirements." },
  { icon: <History className="h-4 w-4" />, text: "Full message history is always saved and scrollable." },
];

export default function ClientMessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center">
        <MessageSquare className="h-8 w-8 text-primary/40" />
      </div>

      {/* Copy */}
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-slate-700">No conversation selected</p>
        <p className="text-sm text-slate-400 max-w-xs">
          Pick a job thread from the sidebar on the left to open that conversation.
        </p>
      </div>

      {/* Tips */}
      <div className="flex flex-col gap-2 text-left max-w-xs w-full">
        {TIPS.map((tip, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
            <span className="mt-0.5 text-slate-300 flex-shrink-0">{tip.icon}</span>
            {tip.text}
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/client/jobs"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Go to My Jobs
      </Link>
    </div>
  );
}

