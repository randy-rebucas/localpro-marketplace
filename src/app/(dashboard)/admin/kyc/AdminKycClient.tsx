"use client";

import { useState, useMemo } from "react";
import {
  Search, X, ChevronDown, ChevronUp,
  ShieldCheck, ShieldX, Clock, ExternalLink, FileText, Users,
} from "lucide-react";
import AdminKycActions from "./AdminKycActions";
import AdminCertifyButton from "./AdminCertifyButton";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KycDoc {
  type: string;
  url: string;
  uploadedAt: string;
}

export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: string;
  kycDocuments: KycDoc[];
  kycRejectionReason?: string | null;
  createdAt: string;
}

interface Props {
  pending: SerializedUser[];
  reviewed: SerializedUser[];
  certMap: Record<string, boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", icon: <Clock className="h-4 w-4" />,      cls: "text-amber-700 bg-amber-50 border-amber-200" },
  approved: { label: "Approved",       icon: <ShieldCheck className="h-4 w-4" />, cls: "text-green-700 bg-green-50 border-green-200" },
  rejected: { label: "Rejected",       icon: <ShieldX className="h-4 w-4" />,     cls: "text-red-700 bg-red-50 border-red-200" },
};

type RoleFilter    = "all" | "provider" | "client";
type ReviewedFilter = "all" | "approved" | "rejected";

// ─── ProviderRow ──────────────────────────────────────────────────────────────

function ProviderRow({ u, certMap }: { u: SerializedUser; certMap: Record<string, boolean> }) {
  const cfg = STATUS_CONFIG[u.kycStatus as keyof typeof STATUS_CONFIG];
  const isProvider = u.role === "provider";
  const isCertified = isProvider ? (certMap[u.id] ?? false) : false;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">{u.name}</p>
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isProvider
                ? "bg-violet-50 text-violet-700 border-violet-200"
                : "bg-sky-50 text-sky-700 border-sky-200"
            }`}>
              {isProvider ? "Provider" : "Client"}
            </span>
            {isCertified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                🎖️ Certified
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{u.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Submitted {new Date(u.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 flex-shrink-0 ${cfg?.cls}`}>
          {cfg?.icon}{cfg?.label}
        </span>
      </div>

      {/* Documents */}
      {u.kycDocuments.length > 0 ? (
        <div className="px-5 pb-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Documents ({u.kycDocuments.length})
          </p>
          <div className="space-y-1.5">
            {u.kycDocuments.map((doc, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 capitalize leading-none">{doc.type.replace(/_/g, " ")}</p>
                    {doc.uploadedAt && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0 ml-3"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-400 italic">No documents uploaded.</p>
        </div>
      )}

      {/* Rejection reason */}
      {u.kycStatus === "rejected" && u.kycRejectionReason && (
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">
            <ShieldX className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span><span className="font-semibold">Rejection reason:</span> {u.kycRejectionReason}</span>
          </div>
        </div>
      )}

      {/* Pending actions */}
      {u.kycStatus === "pending" && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
          <AdminKycActions userId={u.id} />
        </div>
      )}

      {/* Certification toggle */}
      {u.kycStatus === "approved" && isProvider && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-end">
          <AdminCertifyButton userId={u.id} isLocalProCertified={isCertified} />
        </div>
      )}
    </div>
  );
}

// ─── Role filter tab ──────────────────────────────────────────────────────────

function RoleTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
    </button>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function AdminKycClient({ pending, reviewed, certMap }: Props) {
  const [search, setSearch]               = useState("");
  const [roleFilter, setRoleFilter]       = useState<RoleFilter>("all");
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("all");
  const [reviewedOpen, setReviewedOpen]   = useState(false);

  // ── Filtering helpers ────────────────────────────────────────────────────────

  function matchesSearch(u: SerializedUser, q: string) {
    if (!q) return true;
    const lower = q.toLowerCase();
    return u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower);
  }

  function matchesRole(u: SerializedUser, r: RoleFilter) {
    if (r === "all") return true;
    return r === "provider" ? u.role === "provider" : u.role !== "provider";
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filteredPending = useMemo(() =>
    pending.filter((u) => matchesSearch(u, search) && matchesRole(u, roleFilter)),
    [pending, search, roleFilter]
  );

  const filteredReviewed = useMemo(() =>
    reviewed.filter((u) =>
      matchesSearch(u, search) &&
      matchesRole(u, roleFilter) &&
      (reviewedFilter === "all" || u.kycStatus === reviewedFilter)
    ),
    [reviewed, search, roleFilter, reviewedFilter]
  );

  // Role counts (unfiltered by role, filtered by search)
  const counts = useMemo(() => {
    const searchedPending  = pending.filter((u) => matchesSearch(u, search));
    const searchedReviewed = reviewed.filter((u) => matchesSearch(u, search));
    const all = [...searchedPending, ...searchedReviewed];
    return {
      all:      all.length,
      provider: all.filter((u) => u.role === "provider").length,
      client:   all.filter((u) => u.role !== "provider").length,
    };
  }, [pending, reviewed, search]);

  const nApproved = reviewed.filter((u) => u.kycStatus === "approved").length;
  const nRejected = reviewed.filter((u) => u.kycStatus === "rejected").length;
  const hasActiveSearch = search.trim().length > 0;

  return (
    <div className="space-y-5">

      {/* ── Search + Role filters ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 pr-8 w-full text-sm h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Role filter tabs */}
        <div className="flex items-center gap-1.5">
          <RoleTab label="All"       count={counts.all}      active={roleFilter === "all"}      onClick={() => setRoleFilter("all")} />
          <RoleTab label="Providers" count={counts.provider}  active={roleFilter === "provider"}  onClick={() => setRoleFilter("provider")} />
          <RoleTab label="Clients"   count={counts.client}    active={roleFilter === "client"}    onClick={() => setRoleFilter("client")} />
        </div>
      </div>

      {/* ── Pending section ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Pending
            <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {filteredPending.length}
            </span>
          </h3>
          {hasActiveSearch && filteredPending.length !== pending.length && (
            <span className="text-[11px] text-slate-400">{pending.length - filteredPending.length} hidden by filter</span>
          )}
        </div>

        {filteredPending.length === 0 ? (
          hasActiveSearch ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Search className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No pending submissions match your search.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <ShieldCheck className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">All caught up!</p>
              <p className="text-slate-400 text-xs mt-1">No pending KYC submissions.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {filteredPending.map((u) => <ProviderRow key={u.id} u={u} certMap={certMap} />)}
          </div>
        )}
      </section>

      {/* ── Reviewed section (collapsible) ───────────────────────────────────── */}
      {reviewed.length > 0 && (
        <section>
          {/* Section toggle header */}
          <button
            type="button"
            onClick={() => setReviewedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Recently Reviewed
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                  <ShieldCheck className="h-3 w-3" /> {nApproved}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  <ShieldX className="h-3 w-3" /> {nRejected}
                </span>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {reviewedOpen
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {reviewedOpen && (
            <div className="mt-3 space-y-3">
              {/* Status filter for reviewed */}
              <div className="flex items-center gap-2">
                {(["all", "approved", "rejected"] as ReviewedFilter[]).map((s) => {
                  const cnt = s === "all" ? reviewed.length : reviewed.filter((u) => u.kycStatus === s).length;
                  const active = reviewedFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewedFilter(s)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors capitalize ${
                        active
                          ? s === "approved" ? "bg-green-600 text-white border-green-600"
                            : s === "rejected" ? "bg-red-600 text-white border-red-600"
                            : "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({cnt})
                    </button>
                  );
                })}
                <span className="ml-auto text-[11px] text-slate-400">Last 50 entries</span>
              </div>

              {filteredReviewed.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-slate-400 text-sm">No entries match your filter.</p>
                </div>
              ) : (
                filteredReviewed.map((u) => <ProviderRow key={u.id} u={u} certMap={certMap} />)
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
