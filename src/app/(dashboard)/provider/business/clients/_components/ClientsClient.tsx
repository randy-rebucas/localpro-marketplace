"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { UsersRound, RefreshCw, Search, Briefcase, TrendingUp, CalendarDays, ChevronDown, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchClient } from "@/lib/fetchClient";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  joinedAt: string;
  jobCount: number;
  totalValue: number;
  lastJobDate: string;
  lastJobTitle: string;
  statuses: string[];
  categories: string[];
}

type SortKey = "recent" | "jobs" | "revenue";

const STATUS_BADGE: Record<string, string> = {
  assigned:    "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-800",
  completed:   "bg-emerald-100 text-emerald-700",
  disputed:    "bg-red-100 text-red-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return (
      <Image
        src={avatar} alt={name} width={40} height={40}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 ring-2 ring-slate-100">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientsClient() {
  const t = useTranslations("providerPages");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [sort, setSort]       = useState<SortKey>("recent");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClient<{ clients: Client[] }>("/api/provider/agency/clients");
      setClients(data.clients);
    } catch {
      toast.error(t("provClients_toastFailLoad"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "jobs")    return b.jobCount - a.jobCount;
      if (sort === "revenue") return b.totalValue - a.totalValue;
      return new Date(b.lastJobDate).getTime() - new Date(a.lastJobDate).getTime();
    });

  const repeatClients = clients.filter((c) => c.jobCount > 1).length;

  const totalRevenue = clients.reduce((s, c) => s + c.totalValue, 0);
  const totalJobs    = clients.reduce((s, c) => s + c.jobCount, 0);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <UsersRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provClients_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{clients.length !== 1 ? t("provClients_subCountPlural", { count: clients.length }) : t("provClients_subCount", { count: clients.length })}</p>
          </div>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("provClients_kpiTotalClients"),  value: clients.length.toString(),    icon: UsersRound, color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100" },
          { label: t("provClients_kpiTotalJobs"),     value: totalJobs.toString(),          icon: Briefcase,  color: "text-blue-600",  bg: "bg-blue-50",  ring: "ring-blue-100" },
          { label: t("provClients_kpiRevenue"),       value: formatCurrency(totalRevenue),  icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
          { label: t("provClients_kpiRepeat"),        value: repeatClients.toString(),      icon: Star,       color: "text-amber-600",  bg: "bg-amber-50",  ring: "ring-amber-100" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className={`${c.bg} ring-4 ${c.ring} p-2 rounded-xl w-fit`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-xl font-bold leading-tight ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Sort ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            className="input w-full pl-9"
            placeholder={t("provClients_searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative flex-shrink-0">
          <select
            className="input text-sm pr-8 appearance-none"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="recent">{t("provClients_sortRecent")}</option>
            <option value="jobs">{t("provClients_sortJobs")}</option>
            <option value="revenue">{t("provClients_sortRevenue")}</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Client List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 gap-3 text-center">
          <UsersRound className="h-9 w-9 text-slate-300" />
          <p className="text-slate-500 text-sm">
            {query ? t("provClients_emptySearch") : t("provClients_emptyDefault")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div key={client._id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <Avatar name={client.name} avatar={client.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{client.name}</p>
                      <p className="text-xs text-slate-400 truncate">{client.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {client.jobCount > 1 && (
                        <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-semibold">
                          {t("provClients_repeatBadge")}
                        </span>
                      )}
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">
                          {client.jobCount} job{client.jobCount !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-emerald-700 font-semibold tabular-nums">
                          {formatCurrency(client.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center flex-wrap gap-2">
                    {client.statuses.map((st) => (
                      <span key={st} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[st] ?? "bg-slate-100 text-slate-500"}`}>
                        {st.replace(/_/g, " ")}
                      </span>
                    ))}
                    {client.categories.slice(0, 3).map((cat) => (
                      <span key={cat} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                    <CalendarDays className="h-3 w-3 flex-shrink-0" />
                    <span>{t("provClients_lastJob")} <span className="text-slate-600 font-medium">{formatDate(client.lastJobDate)}</span></span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="truncate text-slate-500" title={client.lastJobTitle}>{client.lastJobTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
