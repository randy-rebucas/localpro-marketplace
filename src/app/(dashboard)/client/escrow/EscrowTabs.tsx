"use client";

import { useState } from "react";
import { EscrowBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck, AlertOctagon, Zap, Clock, CircleCheck } from "lucide-react";
import ProviderInfoButton from "@/components/shared/ProviderInfoButtonLazy";

interface EscrowJobClient {
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

const TABS = [
  { key: "needsAction", label: "Needs Action",  icon: Zap,          color: "amber" },
  { key: "inProgress",  label: "In Progress",   icon: Clock,         color: "blue"  },
  { key: "disputed",    label: "Disputed",       icon: AlertOctagon,  color: "red"   },
  { key: "done",        label: "Completed",      icon: CircleCheck,   color: "green" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const COLOR = {
  amber: { badge: "bg-amber-100 text-amber-700", icon: "text-amber-500", active: "border-amber-500 text-amber-700" },
  blue:  { badge: "bg-blue-100 text-blue-700",   icon: "text-blue-500",  active: "border-blue-500 text-blue-700"   },
  red:   { badge: "bg-red-100 text-red-700",     icon: "text-red-500",   active: "border-red-500 text-red-700"     },
  green: { badge: "bg-green-100 text-green-700", icon: "text-green-500", active: "border-green-500 text-green-700" },
};

function EscrowCard({ j, fundedAmount }: { j: EscrowJobClient; fundedAmount?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/client/jobs/${j._id}`} className="font-semibold text-slate-900 hover:text-primary text-sm">
            {j.title}
          </Link>
          <p className="text-xs text-slate-400 mt-1">
            Provider: <span className="font-medium text-slate-600">{j.providerId?.name ?? "—"}</span>
            {" · "}Scheduled {formatDate(new Date(j.scheduleDate))}
          </p>
          {j.providerId?._id && (
            <div className="mt-1.5">
              <ProviderInfoButton
                providerId={j.providerId._id.toString()}
                providerName={j.providerId.name}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-400">Budget</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(j.budget)}</p>
          </div>
          <EscrowBadge status={j.escrowStatus as never} />
          {j.status === "assigned" && j.escrowStatus === "not_funded" && (
            <Link href={`/client/jobs/${j._id}`} className="btn-primary text-xs py-1.5 px-3">
              Fund Escrow →
            </Link>
          )}
          {j.status === "completed" && j.escrowStatus === "funded" && (
            <Link href={`/client/jobs/${j._id}`} className="text-xs py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
              Release Payment →
            </Link>
          )}
        </div>
      </div>

      {fundedAmount !== undefined && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 flex-1 text-sm">
            <span className="text-slate-600">
              Funded: <span className="font-semibold text-slate-900">{formatCurrency(fundedAmount)}</span>
            </span>
            {fundedAmount !== j.budget && (
              <span className="text-xs text-slate-400 line-through">{formatCurrency(j.budget)} original</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EscrowTabs({ needsAction, inProgress, disputed, done, fundedAmounts }: Props) {
  const counts: Record<TabKey, number> = {
    needsAction: needsAction.length,
    inProgress: inProgress.length,
    disputed: disputed.length,
    done: done.length,
  };

  const groups: Record<TabKey, EscrowJobClient[]> = { needsAction, inProgress, disputed, done };

  // Default to first tab that has items, or "needsAction"
  const defaultTab = (TABS.find((t) => counts[t.key] > 0)?.key ?? "needsAction") as TabKey;
  const [active, setActive] = useState<TabKey>(defaultTab);

  const items = groups[active];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl w-fit max-w-full">
        {TABS.map((tab) => {
          const count = counts[tab.key];
          const c = COLOR[tab.color];
          const isActive = active === tab.key;
          const Icon = tab.icon;
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
              <Icon className={`h-3.5 w-3.5 ${isActive ? c.icon : ""}`} />
              {tab.label}
              {count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isActive ? c.badge : "bg-slate-200 text-slate-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No {TABS.find((t) => t.key === active)?.label.toLowerCase()} jobs.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((j) => (
            <EscrowCard key={j._id} j={j} fundedAmount={fundedAmounts[j._id]} />
          ))}
        </div>
      )}
    </div>
  );
}
