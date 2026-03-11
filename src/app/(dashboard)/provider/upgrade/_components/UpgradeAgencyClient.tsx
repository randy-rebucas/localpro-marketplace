"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CheckCircle2, Sparkles, Briefcase, TrendingUp,
  ShieldCheck, Star, Zap, ArrowRight, Loader2, ChevronLeft, Building2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

const BENEFITS = [
  {
    icon: <Users className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Agency Profile",
    description: "List your agency on the marketplace with a team roster and branded profile.",
  },
  {
    icon: <Briefcase className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Team Job Management",
    description: "Assign jobs to team members and track progress across your crew.",
  },
  {
    icon: <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Bulk Quote Submissions",
    description: "Submit quotes on behalf of your team with a single agency bid.",
  },
  {
    icon: <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Agency Verified Badge",
    description: "Stand out with a verified Agency badge that builds client trust.",
  },
  {
    icon: <Star className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Consolidated Ratings",
    description: "Agency-wide reputation score based on all team member reviews.",
  },
  {
    icon: <Zap className="h-4.5 w-4.5 text-emerald-400" />,
    title: "Priority Job Access",
    description: "Get early access to high-value jobs before they open to individual providers.",
  },
];

export default function UpgradeAgencyClient({ userName }: { userName: string }) {
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/upgrade-agency", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setDone(true);
      toast.success("🎉 Agency account activated!");
      await fetchMe();
      setTimeout(() => router.push("/provider/dashboard"), 1_800);
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
          <h1 className="text-2xl font-bold text-emerald-100">You&apos;re now an Agency!</h1>
          <p className="text-slate-400 text-sm">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Hero */}
      <div className="rounded-2xl border border-emerald-700 bg-emerald-950/60 p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-900 border border-emerald-700 mb-1">
          <Building2 className="h-6 w-6 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-emerald-100 tracking-tight leading-tight">
            Go Agency — It&apos;s Free
          </h1>
          <p className="text-slate-200 text-sm leading-relaxed max-w-sm mx-auto">
            Hi <span className="text-emerald-300 font-semibold">{userName}</span>! Scale your
            services into a full agency. Manage a team, take on bigger jobs, and grow faster.
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
              className="group flex gap-3 p-3.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-emerald-950/60 hover:border-emerald-700 transition-all duration-150"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-900 border border-emerald-700/60 flex items-center justify-center mt-0.5">
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
            bg-emerald-700 hover:bg-emerald-600
            text-white font-bold text-sm shadow-md
            active:scale-[0.98] transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{loading ? "Activating…" : "Activate Agency Account for Free"}</span>
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
