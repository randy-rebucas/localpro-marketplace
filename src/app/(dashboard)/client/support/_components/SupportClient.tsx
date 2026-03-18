"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Headphones, Clock, ShieldCheck, AlertCircle, Lock, ArrowUpRight, Ticket, MessageCircle } from "lucide-react";
import MyTickets from "@/components/shared/MyTickets";
import TourGuide from "@/components/shared/TourGuide";
import { fetchClient } from "@/lib/fetchClient";
import { hasPrioritySupportAccess, PLAN_LABELS, PLAN_UPGRADE_NEXT } from "@/lib/businessPlan";
import { useTranslations } from "next-intl";
import type { IBusinessOrganization } from "@/types";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 animate-pulse rounded-xl" />
  ),
});

const INFO_CHIPS = [
  { icon: <Clock className="h-3 w-3" />, text: "Mon–Sat, 8 am–6 pm" },
  { icon: <Headphones className="h-3 w-3" />, text: "Reply within a few hours" },
  { icon: <ShieldCheck className="h-3 w-3" />, text: "Disputes & payment issues supported" },
];

export default function SupportClient({ userId }: { userId: string }) {
  const t = useTranslations("clientPages");
  const [org, setOrg] = useState<IBusinessOrganization | null | undefined>(undefined);
  const [tab, setTab] = useState<"chat" | "tickets">("chat");

  const INFO_CHIPS = [
    { icon: <Clock className="h-3 w-3" />, text: t("clientSupport_chipHours") },
    { icon: <Headphones className="h-3 w-3" />, text: t("clientSupport_chipReply") },
    { icon: <ShieldCheck className="h-3 w-3" />, text: t("clientSupport_chipDisputes") },
  ];

  useEffect(() => {
    fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org")
      .then((d) => setOrg(d.org))
      .catch(() => setOrg(null));
  }, []);

  // Business client on a non-enterprise plan → upgrade wall
  if (org && !hasPrioritySupportAccess(org.plan)) {
    const planLabel = PLAN_LABELS[org.plan];
    const nextPlan  = PLAN_UPGRADE_NEXT[org.plan];
    const nextLabel = nextPlan ? PLAN_LABELS[nextPlan] : "Enterprise";
    return (
      <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t("clientSupport_heading")}</h2>
            <p className="text-slate-500 text-sm mt-1">{t("clientSupport_subheading")}</p>
          </div>
        </div>

        {/* Upgrade wall */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-300/20 blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Lock className="h-7 w-7 text-amber-500" />
            </div>
          </div>
          <div className="max-w-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t("clientSupport_wallTitle")}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              {t("clientSupport_wallDesc", { plan: planLabel })}
            </p>
          </div>
          {nextPlan && (
            <a
              href="/client/business/billing"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              {t("clientSupport_wallUpgradeBtn", { plan: nextLabel })}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          <a href="/client/business" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            {t("clientSupport_wallBackBtn")}
          </a>

          {/* Blurred preview */}
          <div className="relative w-full max-w-lg mt-2 pointer-events-none select-none">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden blur-sm opacity-40">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Headphones className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">{t("clientSupport_previewName")}</p>
                  <span className="text-[11px] text-emerald-600">{t("clientSupport_previewStatus")}</span>
                </div>
              </div>
              <div className="px-4 py-6 space-y-3">
                <div className="flex justify-end"><div className="h-8 w-44 rounded-xl bg-primary/20" /></div>
                <div className="flex"><div className="h-8 w-52 rounded-xl bg-slate-200" /></div>
                <div className="flex"><div className="h-8 w-40 rounded-xl bg-slate-200" /></div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                <div className="flex-1 h-9 rounded-xl bg-slate-100" />
                <div className="h-9 w-9 rounded-xl bg-primary/20" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-500 bg-white/80 rounded-full px-3 py-1 border border-slate-200">{t("clientSupport_previewBadge")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "chat"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> {t("clientSupport_tabChat")}
        </button>
        <button
          onClick={() => setTab("tickets")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "tickets"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Ticket className="h-4 w-4" /> {t("clientSupport_tabTickets")}
        </button>
      </div>

      {tab === "tickets" && <MyTickets />}
      {tab === "chat" && <>
      <TourGuide
        pageKey="client-support"
        title={t("clientSupport_tourTitle")}
        steps={[
          { icon: "🎧", title: t("clientSupport_tourStep1Title"), description: t("clientSupport_tourStep1Desc") },
          { icon: "⏱️", title: t("clientSupport_tourStep2Title"), description: t("clientSupport_tourStep2Desc") },
          { icon: "🔍", title: t("clientSupport_tourStep3Title"), description: t("clientSupport_tourStep3Desc") },
          { icon: "📋", title: t("clientSupport_tourStep4Title"), description: t("clientSupport_tourStep4Desc") },
        ]}
      />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t("clientSupport_heading")}</h2>
          <p className="text-slate-500 text-sm mt-1">{t("clientSupport_subheading")}</p>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-2">
        {INFO_CHIPS.map((chip, i) => (
          <div key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
            <span className="text-slate-400">{chip.icon}</span>
            {chip.text}
          </div>
        ))}
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          {t("clientSupport_tipPre")} <strong>{t("clientSupport_tipBold")}</strong>{" "}
          {t("clientSupport_tipPost")}
        </p>
      </div>

      <ChatWindow
        fetchUrl="/api/support"
        postUrl="/api/support"
        streamUrl="/api/support/stream"
        attachUrl="/api/support/attachment"
        currentUserId={userId}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{t("clientSupport_chatName")}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("clientSupport_chatStatus")}
              </span>
            </div>
          </div>
        }
        emptyMessage={t("clientSupport_emptyMessage")}
      />
      </>}
    </div>
  );
}
