import type { Metadata } from "next";
import { MessageSquare, ImagePlus, History, Briefcase } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Messages" };

const TIPS = [
  {
    icon: <MessageSquare className="h-4 w-4" />,
    title: "One thread per job",
    text: "Each assigned job gets its own private conversation with the provider.",
  },
  {
    icon: <ImagePlus className="h-4 w-4" />,
    title: "Share files & photos",
    text: "Attach images or documents directly in the chat to clarify details.",
  },
  {
    icon: <History className="h-4 w-4" />,
    title: "Full history saved",
    text: "Every message is stored and searchable — nothing gets lost.",
  },
];

export default function ClientMessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-10 py-16 text-center select-none">

      {/* Decorative chat bubbles */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <div className="absolute bottom-0 left-0 w-12 h-8 rounded-2xl rounded-bl-sm bg-slate-100 border border-slate-200" />
        <div className="absolute top-0 right-0 w-14 h-8 rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20" />
        <div className="absolute bottom-2 left-3 w-5 h-1.5 rounded-full bg-slate-300" />
        <div className="absolute bottom-5 left-3 w-8 h-1.5 rounded-full bg-slate-300" />
        <div className="absolute top-2 right-3 w-4 h-1.5 rounded-full bg-primary/30" />
        <div className="absolute top-5 right-3 w-7 h-1.5 rounded-full bg-primary/30" />
      </div>

      {/* Heading */}
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-slate-700">No conversation open</p>
        <p className="text-sm text-slate-400 max-w-[260px]">
          Select a job thread from the sidebar to start chatting with your provider.
        </p>
      </div>

      {/* Tips */}
      <div className="flex flex-col gap-3 text-left max-w-[280px] w-full">
        {TIPS.map((tip, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 text-slate-400">
              {tip.icon}
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-600">{tip.title}</p>
              <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/client/jobs"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/8 text-primary text-xs font-medium hover:bg-primary/14 transition-colors"
      >
        <Briefcase className="h-3.5 w-3.5" />
        View My Jobs
      </Link>
    </div>
  );
}

