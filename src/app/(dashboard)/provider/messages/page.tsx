import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare, Star, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Messages" };

const TIPS = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Respond quickly",
    text: "Fast replies build trust and increase your chances of winning jobs.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Clarify scope upfront",
    text: "Agree on timeline, price, and deliverables before starting work.",
  },
  {
    icon: <Star className="h-4 w-4" />,
    title: "Quality gets reviewed",
    text: "Great communication leads to 5-star reviews and repeat clients.",
  },
];

export default async function ProviderMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ jobId?: string }>;
}) {
  const params = await searchParams;
  if (params?.jobId) {
    redirect(`/provider/messages/${params.jobId}`);
  }

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
          Select a job thread from the sidebar to message your client.
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
        href="/provider/jobs"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/8 text-primary text-xs font-medium hover:bg-primary/14 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Browse Active Jobs
      </Link>
    </div>
  );
}
