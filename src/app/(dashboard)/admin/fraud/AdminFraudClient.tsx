"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, X, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, User as UserIcon, Briefcase,
  Flag, ChevronRight, ArrowUpDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerializedJob {
  id: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  riskScore: number;
  fraudFlags: string[];
  clientId: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
}

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  flaggedJobCount: number;
  fraudFlags: string[];
  createdAt: string;
}

interface Props {
  flaggedJobs: SerializedJob[];
  suspiciousUsers: SerializedUser[];
}

// ─── RiskBadge ────────────────────────────────────────────────────────────────

function RiskBadge({ score }: { score: number }) {
  if (score >= 70)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Critical · {score}
      </span>
    );
  if (score >= 50)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        High · {score}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Med · {score}
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "red" | "orange" | "amber" | "rose";
  active?: boolean;
  onClick?: () => void;
}) {
  const colorMap = {
    red:    "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 hover:border-red-300",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 hover:border-orange-300",
    amber:  "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 hover:border-amber-300",
    rose:   "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 hover:border-rose-300",
  };
  const ringMap = {
    red: "ring-2 ring-red-400",
    orange: "ring-2 ring-orange-400",
    amber: "ring-2 ring-amber-400",
    rose: "ring-2 ring-rose-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 flex items-center gap-3 text-left transition-all ${colorMap[color]} ${active ? ringMap[color] : ""} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </button>
  );
}

// ─── FilterTab ────────────────────────────────────────────────────────────────

function FilterTab({ label, count, active, onClick, colorActive = "slate" }: {
  label: string; count: number; active: boolean; onClick: () => void;
  colorActive?: "slate" | "red" | "orange";
}) {
  const activeClass = {
    slate:  "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white",
    red:    "bg-red-600 text-white border-red-600",
    orange: "bg-orange-500 text-white border-orange-500",
  }[colorActive];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
        active ? activeClass : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── JobRow ───────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: SerializedJob }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className={`h-1 w-full ${job.riskScore >= 70 ? "bg-red-500" : "bg-orange-400"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/admin/jobs/${job.id}`}
              className="font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors text-sm"
            >
              {job.title}
            </Link>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 dark:text-slate-500">
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-2 py-0.5 font-medium">{job.category}</span>
              <span>
                Client:{" "}
                <Link href={`/admin/users/${job.clientId}`} className="text-primary hover:underline">
                  {job.clientName}
                </Link>
              </span>
              <span>{formatDate(job.createdAt)}</span>
              <span className="capitalize">{job.status.replace(/_/g, " ")}</span>
            </div>
          </div>
          <div className="flex-shrink-0 text-right space-y-1.5">
            <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(job.budget)}</p>
            <RiskBadge score={job.riskScore} />
          </div>
        </div>

        {job.fraudFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {job.fraudFlags.map((flag, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-full px-2.5 py-0.5">
                <Flag className="h-2.5 w-2.5" />{flag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Link href={`/admin/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
            Review job <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({ u }: { u: SerializedUser }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/users/${u.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors text-sm">
              {u.name}
            </Link>
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 capitalize">
              {u.role}
            </span>
            {u.isSuspended && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600">
                Suspended
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 dark:text-slate-500">
            <span>{u.email}</span>
            <span>KYC: {u.kycStatus ?? "none"}</span>
            <span>Joined {formatDate(u.createdAt)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full px-2.5 py-1">
            <Flag className="h-3 w-3" />
            {u.flaggedJobCount} flagged job{u.flaggedJobCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {u.fraudFlags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {u.fraudFlags.map((flag, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full px-2.5 py-0.5">
              <ShieldAlert className="h-2.5 w-2.5" />{flag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Link href={`/admin/users/${u.id}`} className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          View profile <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type RiskFilter  = "all" | "critical" | "high";
type UserFilter  = "all" | "suspended" | "active";
type SortOrder   = "risk" | "date";

export default function AdminFraudClient({ flaggedJobs, suspiciousUsers }: Props) {
  const [search, setSearch]           = useState("");
  const [riskFilter, setRiskFilter]   = useState<RiskFilter>("all");
  const [userFilter, setUserFilter]   = useState<UserFilter>("all");
  const [sortJobs, setSortJobs]       = useState<SortOrder>("risk");
  const [usersOpen, setUsersOpen]     = useState(true);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase();
    return flaggedJobs
      .filter((j) => {
        if (q && !j.title.toLowerCase().includes(q) && !j.clientName.toLowerCase().includes(q) && !j.clientEmail.toLowerCase().includes(q)) return false;
        if (riskFilter === "critical") return j.riskScore >= 70;
        if (riskFilter === "high")     return j.riskScore >= 50 && j.riskScore < 70;
        return true;
      })
      .sort((a, b) =>
        sortJobs === "risk"
          ? b.riskScore - a.riskScore
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [flaggedJobs, search, riskFilter, sortJobs]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return suspiciousUsers.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (userFilter === "suspended") return u.isSuspended;
      if (userFilter === "active")    return !u.isSuspended;
      return true;
    });
  }, [suspiciousUsers, search, userFilter]);

  const nCritical  = flaggedJobs.filter((j) => j.riskScore >= 70).length;
  const nHigh      = flaggedJobs.filter((j) => j.riskScore >= 50 && j.riskScore < 70).length;
  const nSuspended = suspiciousUsers.filter((u) => u.isSuspended).length;

  const hasSearch = search.trim().length > 0;

  // ── Stat card click shortcuts ─────────────────────────────────────────────

  function onStatClick(r: RiskFilter) {
    setRiskFilter((prev) => prev === r ? "all" : r);
  }

  return (
    <div className="space-y-6">

      {/* ── Stats (clickable as quick-filters) ──────────────────────────────── */}
      <div data-tour="fraud-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
          label="Critical Jobs" value={nCritical} color="red"
          active={riskFilter === "critical"}
          onClick={() => onStatClick("critical")}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          label="High-Risk Jobs" value={nHigh} color="orange"
          active={riskFilter === "high"}
          onClick={() => onStatClick("high")}
        />
        <StatCard
          icon={<Flag className="h-5 w-5 text-amber-500" />}
          label="Total Flagged Jobs" value={flaggedJobs.length} color="amber"
          active={riskFilter === "all" && filteredJobs.length === flaggedJobs.length}
          onClick={() => onStatClick("all")}
        />
        <StatCard
          icon={<UserIcon className="h-5 w-5 text-rose-500" />}
          label="Suspicious Users" value={suspiciousUsers.length} color="rose"
        />
      </div>

      {/* ── Search + sort ────────────────────────────────────────────────────── */}
      <div data-tour="fraud-search" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search jobs or users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 pr-8 w-full text-sm h-9 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSortJobs((s) => s === "risk" ? "date" : "risk")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort: {sortJobs === "risk" ? "Risk score" : "Newest first"}
        </button>
      </div>

      {/* ── Flagged Jobs ─────────────────────────────────────────────────────── */}
      <section data-tour="fraud-jobs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">
              Flagged Jobs
              <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">({filteredJobs.length}{hasSearch || riskFilter !== "all" ? ` of ${flaggedJobs.length}` : ""})</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <FilterTab label="All"      count={flaggedJobs.length} active={riskFilter === "all"}      onClick={() => setRiskFilter("all")} />
            <FilterTab label="Critical" count={nCritical}          active={riskFilter === "critical"} onClick={() => setRiskFilter("critical")} colorActive="red" />
            <FilterTab label="High"     count={nHigh}              active={riskFilter === "high"}     onClick={() => setRiskFilter("high")}     colorActive="orange" />
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
              <Flag className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {hasSearch || riskFilter !== "all" ? "No jobs match your filter." : "No flagged jobs at this time."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => <JobRow key={job.id} job={job} />)}
          </div>
        )}
      </section>

      {/* ── Suspicious Users (collapsible) ───────────────────────────────────── */}
      <section data-tour="fraud-users">
        <button
          type="button"
          onClick={() => setUsersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group mb-3"
        >
          <div className="flex items-center gap-3">
            <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-white">
              Suspicious Users
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {suspiciousUsers.length}
            </span>
            {nSuspended > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                {nSuspended} suspended
              </span>
            )}
          </div>
          <span className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            {usersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {usersOpen && (
          <div className="space-y-3">
            {/* User filter tabs */}
            <div className="flex items-center gap-1.5">
              <FilterTab label="All"                count={suspiciousUsers.length}                            active={userFilter === "all"}       onClick={() => setUserFilter("all")} />
              <FilterTab label="Suspended"          count={nSuspended}                                         active={userFilter === "suspended"} onClick={() => setUserFilter("suspended")} colorActive="red" />
              <FilterTab label="Active"             count={suspiciousUsers.length - nSuspended}                active={userFilter === "active"}    onClick={() => setUserFilter("active")} />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
                  <UserIcon className="h-7 w-7 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {hasSearch || userFilter !== "all" ? "No users match your filter." : "No suspicious users detected."}
                </p>
              </div>
            ) : (
              filteredUsers.map((u) => <UserRow key={u.id} u={u} />)
            )}
          </div>
        )}
      </section>
    </div>
  );
}
