"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, Sparkles, Users, Briefcase,
  Headphones, ShieldCheck, Zap, ArrowRight, Loader2, ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";

const BENEFITS = [
  {
    icon: <Briefcase className="h-4.5 w-4.5 text-primary-300" />,
    title: "Unlimited Job Postings",
    description: "Post as many jobs as your business needs — no caps, no queues.",
  },
  {
    icon: <Users className="h-4.5 w-4.5 text-primary-300" />,
    title: "Team Management",
    description: "Add team members and delegate job posting across your organization.",
  },
  {
    icon: <ShieldCheck className="h-4.5 w-4.5 text-primary-300" />,
    title: "Business Profile Badge",
    description: "Stand out with a verified Business badge that builds trust with providers.",
  },
  {
    icon: <Zap className="h-4.5 w-4.5 text-primary-300" />,
    title: "Priority Matching",
    description: "Your jobs are surfaced first to top-rated providers in the marketplace.",
  },
  {
    icon: <Headphones className="h-4.5 w-4.5 text-primary-300" />,
    title: "Priority Support",
    description: "Skip the queue — business accounts get faster response times from our team.",
  },
  {
    icon: <Building2 className="h-4.5 w-4.5 text-primary-300" />,
    title: "Business Hub",
    description: "Access analytics, spend summaries, and recurring job management in one place.",
  },
];

export default function UpgradeBusinessClient({ userName }: { userName: string }) {
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/client/upgrade-business", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setDone(true);
      toast.success("🎉 Business account activated!");
      await fetchMe();
      setTimeout(() => router.push("/client/business"), 1_800);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5 px-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl scale-150" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-primary-100">You&apos;re now a Business!</h1>
          <p className="text-slate-400 text-sm">Taking you to the Business Hub…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl border border-primary-700 bg-primary-950 p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-800 border border-primary-700 mb-1">
          <Sparkles className="h-6 w-6 text-primary-300" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-primary-100 tracking-tight leading-tight">
            Go Business — It&apos;s Free
          </h1>
          <p className="text-slate-200 text-sm leading-relaxed max-w-sm mx-auto">
            Hi <span className="text-primary-300 font-semibold">{userName}</span>! Unlock the full
            power of LocalPro for your business. No credit card. No commitment. Forever free.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          Always free — no hidden charges ever
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-0.5">
          Everything included
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group flex gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-primary-950 hover:border-primary-700 transition-all duration-150"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-800 border border-primary-700 flex items-center justify-center mt-0.5">
                {b.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 leading-snug">{b.title}</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-2.5 pt-1">
        <button
          onClick={handleActivate}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
            bg-primary-600 hover:bg-primary-500
            text-white font-bold text-sm shadow-md
            active:scale-[0.98] transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{loading ? "Activating…" : "Activate Business Account for Free"}</span>
          {!loading && <ArrowRight className="h-4 w-4 ml-auto" />}
        </button>
        <p className="text-xs text-slate-400 text-center">
          By activating, you agree to LocalPro&apos;s{" "}
          <a href="/terms" className="underline hover:text-slate-200 transition-colors">Terms of Service</a>.
          You can downgrade anytime from Settings.
        </p>
      </div>

    </div>
  );
}

