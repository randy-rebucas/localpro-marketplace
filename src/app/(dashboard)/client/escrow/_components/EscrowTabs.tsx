"use client";

import { useState } from "react";
import { EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ShieldCheck, AlertOctagon, Zap, Clock, CircleCheck,
  Calendar, User, ChevronRight, AlertTriangle,
} from "lucide-react";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";

export interface EscrowJobClient {
  _id: string;
  title: string;
  budget: number;
  status: string;
  escrowStatus: string;
  scheduleDate: string;
  providerId?: { _id: string; name: string; email: string; isVerified: boolean } | null;
}

interface Props {
  needsAction: EscrowJobClient[];
  inProgress: EscrowJobClient[];
  disputed: EscrowJobClient[];
  done: EscrowJobClient[];
  fundedAmounts: Record<string, number>;
}

/* ─── Tab definitions ────────────────────────────────────────── */
const TABS = [
  { key: "needsAction", label: "Needs Action", icon: Zap,          color: "amber" },
  { key: "inProgress",  label: "In Progress",  icon: Clock,        color: "blue"  },
  { key: "disputed",    label: "Disputed",      icon: AlertOctagon, color: "red"   },
  { key: "done",        label: "Completed",     icon: CircleCheck,  color: "green" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const COLOR = {
  amber: { badge: "bg-amber-100 text-amber-700",  icon: "text-amber-500",  border: "border-l-amber-400",  dot: "bg-amber-400"  },
  blue:  { badge: "bg-blue-100 text-blue-700",    icon: "text-blue-500",   border: "border-l-blue-400",   dot: "bg-blue-400"   },
  red:   { badge: "bg-red-100 text-red-700",      icon: "text-red-500",    border: "border-l-red-400",    dot: "bg-red-400"    },
  green: { badge: "bg-green-100 text-green-700",  icon: "text-green-500",  border: "border-l-green-400",  dot: "bg-green-400"  },
};

const EMPTY_MESSAGES: Record<TabKey, string> = {
  needsAction: "No action needed right now — you're all caught up!",
  inProgress:  "No jobs currently in progress.",
  disputed:    "No disputes — great news!",
  done:        "No completed escrow releases yet.",
};

/* ─── Empty tab message ──────────────────────────────────────── */
const TAB_TIPS: Record<TabKey, string> = {
  needsAction: "Jobs waiting for escrow funding or payment release appear here.",
  inProgress:  "Funded jobs where work is actively underway appear here.",
  disputed:    "Jobs with an active dispute appear here. Our team will mediate.",
  done:        "Jobs where escrow was fully released to the provider appear here.",
};

/* ─── EscrowCard ─────────────────────────────────────────────── */
function EscrowCard({
  j,
  fundedAmount,
  tabColor,
}: {
  j: EscrowJobClient;
  fundedAmount?: number;
  tabColor: keyof typeof COLOR;
}) {
  const needsFunding = j.status === "assigned"  && j.escrowStatus === "not_funded";
  const needsRelease = j.status === "completed" && j.escrowStatus === "funded";
  const c = COLOR[tabColor];

  return (
    <div
      className={`relative bg-white rounded-xl border border-slate-200 border-l-4 ${c.border} shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-4 sm:p-5 space-y-3 group`}
    >
      {/* Overlay link */}
      <Link href={`/client/jobs/${j._id}`} className="absolute inset-0 rounded-xl" aria-label={j.title} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Urgency pills */}
          {needsFunding && (
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              <Zap className="h-2.5 w-2.5" /> Fund to start
            </span>
          )}
          {needsRelease && (
            <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              <CircleCheck className="h-2.5 w-2.5" /> Ready to release
            </span>
          )}

          <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-primary transition-colors">
            {j.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
            {j.providerId?.name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {j.providerId.name}
                {j.providerId.isVerified && (
                  <span className="text-blue-400 font-medium ml-0.5">✓</span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(new Date(j.scheduleDate))}
            </span>
          </div>
          {j.providerId?._id && (
            <div className="mt-1.5 relative z-10">
              <ProviderInfoButton
                providerId={j.providerId._id.toString()}
                providerName={j.providerId.name}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Budget</p>
            <p className="text-base sm:text-lg font-bold text-slate-900">{formatCurrency(j.budget)}</p>
          </div>
          <EscrowBadge status={j.escrowStatus as never} />
          {needsFunding && (
            <Link
              href={`/client/jobs/${j._id}`}
              className="relative z-10 btn-primary text-xs py-1.5 px-3"
            >
              Fund →
            </Link>
          )}
          {needsRelease && (
            <Link
              href={`/client/jobs/${j._id}`}
              className="relative z-10 text-xs py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Release →
            </Link>
          )}
          <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      {/* Funded escrow row */}
      {fundedAmount !== undefined && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 flex-1 text-sm">
            <span className="text-slate-600">
              Funded:{" "}
              <span className="font-semibold text-slate-900">{formatCurrency(fundedAmount)}</span>
            </span>
            {fundedAmount !== j.budget && (
              <span className="text-xs text-slate-400 line-through">
                {formatCurrency(j.budget)} original
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dispute warning row */}
      {j.status === "disputed" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            Dispute in progress — our team is reviewing this case.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── EscrowTabs ─────────────────────────────────────────────── */
export default function EscrowTabs({
  needsAction,
  inProgress,
  disputed,
  done,
  fundedAmounts,
}: Props) {
  const counts: Record<TabKey, number> = {
    needsAction: needsAction.length,
    inProgress:  inProgress.length,
    disputed:    disputed.length,
    done:        done.length,
  };

  const groups: Record<TabKey, EscrowJobClient[]> = {
    needsAction,
    inProgress,
    disputed,
    done,
  };

  // Default to first tab that has items, or "needsAction"
  const defaultTab =
    (TABS.find((t) => counts[t.key] > 0)?.key ?? "needsAction") as TabKey;
  const [active, setActive] = useState<TabKey>(defaultTab);

  const items      = groups[active];
  const activeTab  = TABS.find((t) => t.key === active)!;
  const c          = COLOR[activeTab.color];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl w-fit max-w-full">
        {TABS.map((tab) => {
          const count   = counts[tab.key];
          const tc      = COLOR[tab.color];
          const isActive = active === tab.key;
          const Icon    = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? tc.icon : ""}`} />
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    isActive ? tc.badge : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center gap-3 text-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.badge}`}>
            <activeTab.icon className={`h-5 w-5 ${c.icon}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {EMPTY_MESSAGES[active]}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {TAB_TIPS[active]}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((j) => (
            <EscrowCard
              key={j._id}
              j={j}
              fundedAmount={fundedAmounts[j._id]}
              tabColor={activeTab.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
