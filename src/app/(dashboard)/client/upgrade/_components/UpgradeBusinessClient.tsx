"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, Sparkles, Users, Briefcase,
  Headphones, ShieldCheck, Zap, ArrowRight, Loader2, ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

export default function UpgradeBusinessClient({ userName }: { userName: string }) {
  const t = useTranslations("clientPages");
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const BENEFITS = [
    { icon: <Briefcase className="h-4.5 w-4.5 text-primary-300" />, title: t("clientUpgrade_benefit1Title"), description: t("clientUpgrade_benefit1Desc") },
    { icon: <Users className="h-4.5 w-4.5 text-primary-300" />,     title: t("clientUpgrade_benefit2Title"), description: t("clientUpgrade_benefit2Desc") },
    { icon: <ShieldCheck className="h-4.5 w-4.5 text-primary-300" />, title: t("clientUpgrade_benefit3Title"), description: t("clientUpgrade_benefit3Desc") },
    { icon: <Zap className="h-4.5 w-4.5 text-primary-300" />,       title: t("clientUpgrade_benefit4Title"), description: t("clientUpgrade_benefit4Desc") },
    { icon: <Headphones className="h-4.5 w-4.5 text-primary-300" />, title: t("clientUpgrade_benefit5Title"), description: t("clientUpgrade_benefit5Desc") },
    { icon: <Building2 className="h-4.5 w-4.5 text-primary-300" />,  title: t("clientUpgrade_benefit6Title"), description: t("clientUpgrade_benefit6Desc") },
  ];

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/client/upgrade-business", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message ?? t("clientUpgrade_toastError"));
        return;
      }

      setDone(true);
      toast.success(t("clientUpgrade_toastSuccess"));
      await fetchMe();
      setTimeout(() => router.push("/client/business"), 1_800);
    } catch {
      toast.error(t("clientUpgrade_toastNetwork"));
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
          <h1 className="text-2xl font-bold text-primary-100">{t("clientUpgrade_successTitle")}</h1>
          <p className="text-slate-400 text-sm">{t("clientUpgrade_successSub")}</p>
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
            {t("clientUpgrade_heroTitle")}
          </h1>
          <p className="text-slate-200 text-sm leading-relaxed max-w-sm mx-auto">
            {t("clientUpgrade_heroSub", { user: userName })}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
          <CheckCircle2 className="h-3 w-3" />
          {t("clientUpgrade_freeBadge")}
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-0.5">
          {t("clientUpgrade_everythingIncluded")}
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
          <span>{loading ? t("clientUpgrade_btnActivating") : t("clientUpgrade_btnActivate")}</span>
          {!loading && <ArrowRight className="h-4 w-4 ml-auto" />}
        </button>
        <p className="text-xs text-slate-400 text-center">
          {t("clientUpgrade_termsPre")}{" "}
          <a href="/terms" className="underline hover:text-slate-200 transition-colors">{t("clientUpgrade_termsLink")}</a>
          {t("clientUpgrade_termsPost")}
        </p>
      </div>

    </div>
  );
}

