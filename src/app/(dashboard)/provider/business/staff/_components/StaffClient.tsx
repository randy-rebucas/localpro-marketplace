"use client";

import { useEffect, useState, useCallback, type ElementType } from "react";
import Image from "next/image";
import {
  Users, Plus, Trash2, Eye, Coins, RefreshCw, Search,
  CheckCircle, AlertCircle, Mail, X, CalendarDays, BarChart2,
  Wrench, Navigation, Star, ArrowRight, TrendingUp, Lock, ArrowUpRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchClient } from "@/lib/fetchClient";
import { MEMBER_LIMITS, PLAN_LABELS, PLAN_UPGRADE_NEXT, isAtMemberLimit, getMemberLimit } from "@/lib/businessPlan";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffRole = "worker" | "dispatcher" | "supervisor" | "finance";
type Tab = "team" | "schedule" | "performance";

interface AgencyProfile {
  _id: string;
  name: string;
  type: string;
  plan: "starter" | "growth" | "pro" | "enterprise";
}

interface StaffMember {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | string;
  role: StaffRole;
  isActive: boolean;
}

interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface StaffStat {
  userId: string;
  completed: number;
  inProgress: number;
  cancelled: number;
  avgRating: number | null;
  reviewCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<StaffRole, string> = {
  worker: "bg-slate-100 text-slate-700",
  dispatcher: "bg-blue-100 text-blue-700",
  supervisor: "bg-violet-100 text-violet-700",
  finance: "bg-emerald-100 text-emerald-700",
};

const ROLE_RING: Record<StaffRole, string> = {
  worker: "bg-slate-50 ring-slate-100 text-slate-600",
  dispatcher: "bg-blue-50 ring-blue-100 text-blue-600",
  supervisor: "bg-violet-50 ring-violet-100 text-violet-600",
  finance: "bg-emerald-50 ring-emerald-100 text-emerald-600",
};

const ROLE_ICONS: Record<StaffRole, ElementType> = {
  worker: Wrench, dispatcher: Navigation, supervisor: Eye, finance: Coins,
};



// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ name, avatar, size = "sm" }: { name?: string; avatar?: string | null; size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  if (avatar) return (
    <Image src={avatar} alt={name ?? ""} width={size === "md" ? 36 : 28} height={size === "md" ? 36 : 28}
      className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100`} />
  );
  return (
    <div className={`${sz} rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-500 flex-shrink-0 ring-2 ring-slate-100`}>
      {name ? name.charAt(0).toUpperCase() : <Users className="h-3.5 w-3.5" />}
    </div>
  );
}

function staffUser(m: StaffMember, unknownText = "Unknown") {
  if (typeof m.userId === "object" && m.userId !== null) return m.userId as { _id: string; name: string; email: string; avatar?: string | null };
  return { _id: String(m.userId), name: unknownText, email: "", avatar: null };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffClient() {
  const t = useTranslations("providerPages");

  const ROLE_LABELS: Record<StaffRole, string> = {
    worker: t("provStaff_roleWorker"),
    dispatcher: t("provStaff_roleDispatcher"),
    supervisor: t("provStaff_roleSupervisor"),
    finance: t("provStaff_roleFinance"),
  };

  const ROLE_DESCS: Record<StaffRole, string> = {
    worker: t("provStaff_descWorker"),
    dispatcher: t("provStaff_descDispatcher"),
    supervisor: t("provStaff_descSupervisor"),
    finance: t("provStaff_descFinance"),
  };

  const [agency, setAgency]               = useState<AgencyProfile | null>(null);
  const [staff, setStaff]                 = useState<StaffMember[]>([]);
  const [tab, setTab]                     = useState<Tab>("team");
  const [loading, setLoading]             = useState(true);
  const [showInvite, setShowInvite]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [searchEmail, setSearchEmail]     = useState("");
  const [searchResult, setSearchResult]   = useState<UserSearchResult | null | "notfound">(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteRole, setInviteRole]       = useState<StaffRole>("worker");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingRole, setEditingRole]     = useState<{ id: string; role: StaffRole } | null>(null);
  const [teamSearch, setTeamSearch]       = useState("");
  const [perfStats, setPerfStats]         = useState<StaffStat[]>([]);
  const [perfLoading, setPerfLoading]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const agencyData = await fetchClient<{ agency: AgencyProfile | null }>("/api/provider/agency/profile");
      if (!agencyData.agency) { setLoading(false); return; }
      setAgency(agencyData.agency);
      const sData = await fetchClient<{ staff: StaffMember[] }>("/api/provider/agency/staff");
      setStaff(sData.staff);
    } catch { toast.error(t("provStaff_errLoadStaff")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load performance stats when performance tab opens
  useEffect(() => {
    if (tab !== "performance" || perfStats.length > 0) return;
    setPerfLoading(true);
    fetchClient<{ stats: StaffStat[] }>("/api/provider/agency/staff/performance")
      .then((d) => setPerfStats(d.stats))
      .catch(() => toast.error(t("provStaff_errLoadPerf")))
      .finally(() => setPerfLoading(false));
  }, [tab, perfStats.length]);

  async function handleEmailSearch() {
    if (!agency || !searchEmail.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await fetchClient<{ user: UserSearchResult | null }>(
        `/api/provider/agency/staff?searchEmail=${encodeURIComponent(searchEmail.trim())}`
      );
      setSearchResult(res.user ?? "notfound");
    } catch { toast.error(t("provStaff_errSearch")); setSearchResult("notfound"); }
    finally { setSearchLoading(false); }
  }

  async function handleInvite() {
    if (!agency || !searchResult || searchResult === "notfound") return;
    setSaving(true);
    try {
      await fetchClient("/api/provider/agency/staff", {
        method: "POST",
        body: JSON.stringify({ agencyId: agency._id, userId: searchResult._id, role: inviteRole }),
      });
      toast.success(t("provStaff_successAdded", { name: searchResult.name, role: ROLE_LABELS[inviteRole] }));
      setShowInvite(false);
      setSearchEmail(""); setSearchResult(null); setInviteRole("worker");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("provStaff_errAddStaff"));
    } finally { setSaving(false); }
  }

  async function handleUpdateRole(staffId: string, role: StaffRole) {
    if (!agency) return;
    try {
      await fetchClient("/api/provider/agency/staff", {
        method: "PATCH",
        body: JSON.stringify({ agencyId: agency._id, staffId, role }),
      });
      await load(); setEditingRole(null); setPerfStats([]);
      toast.success(t("provStaff_successRoleUpdated"));
    } catch { toast.error(t("provStaff_errUpdateRole")); }
  }

  async function handleRemove(staffId: string) {
    if (!agency) return;
    setConfirmRemoveId(null);
    try {
      await fetchClient(`/api/provider/agency/staff?agencyId=${agency._id}&staffId=${staffId}`, { method: "DELETE" });
      await load(); setPerfStats([]);
      toast.success(t("provStaff_successRemoved"));
    } catch { toast.error(t("provStaff_errRemove")); }
  }

  const roleCounts = staff.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<StaffRole, number>);
  const filteredStaff = teamSearch.trim()
    ? staff.filter((m) => {
        const u = staffUser(m, t("provStaff_unknown"));
        const q = teamSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
    : staff;
  const perfMap = Object.fromEntries(perfStats.map((s) => [s.userId, s]));

  // Plan limit calculations
  const staffLimit = agency ? MEMBER_LIMITS[agency.plan] : Infinity;
  const atLimit = agency ? isAtMemberLimit(agency.plan, staff.length) : false;
  const planLabel = agency ? PLAN_LABELS[agency.plan] : "";
  const nextPlan = agency ? PLAN_UPGRADE_NEXT[agency.plan] : undefined;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-9 w-52 bg-slate-200 rounded-lg" />
      <div className="grid sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}</div>
      <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-[72px] bg-slate-200 rounded-2xl" />)}</div>
    </div>
  );

  if (!agency) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <Users className="h-10 w-10 text-slate-300" />
      <p className="text-slate-500">{t("provStaff_noAgency")} <a href="/provider/business" className="text-primary underline">{t("provStaff_noAgencyLink")}</a></p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">{t("provStaff_heading")}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{agency.name} &middot; {staff.length} {t(staff.length !== 1 ? "provStaff_staffMembers" : "provStaff_staffMember")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Plan quota badge */}
          {tab === "team" && agency && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              atLimit
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}>
              <Users className="h-3 w-3" />
              {staff.length} / {staffLimit === Infinity ? "\u221e" : staffLimit} &middot; {planLabel}
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {tab === "team" && (
            <button
              onClick={() => { if (!atLimit) { setShowInvite((v) => !v); setSearchEmail(""); setSearchResult(null); } }}
              disabled={!showInvite && atLimit}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showInvite ? <X className="h-4 w-4" /> : atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showInvite ? t("provStaff_btnCancel") : t("provStaff_btnAddStaff")}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: "team",        icon: Users,       label: t("provStaff_tabTeam")        },
          { id: "schedule",    icon: CalendarDays, label: t("provStaff_tabSchedule")   },
          { id: "performance", icon: BarChart2,    label: t("provStaff_tabPerformance") },
        ] as { id: Tab; icon: ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════ TEAM TAB ══════════════ */}
      {tab === "team" && (
        <div className="space-y-5">

          {/* Role guide cards */}
          <div className="grid sm:grid-cols-4 gap-3">
            {(["worker","dispatcher","supervisor","finance"] as StaffRole[]).map((role) => {
              const Icon = ROLE_ICONS[role];
              return (
                <div key={role} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ring-4 ${ROLE_RING[role]}`}><Icon className="h-4 w-4" /></div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ROLE_COLORS[role]}`}>
                      {roleCounts[role] ?? 0}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{ROLE_LABELS[role]}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{ROLE_DESCS[role]}</p>
                </div>
              );
            })}
          </div>

          {/* Plan limit upgrade banner */}
          {atLimit && !showInvite && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-amber-800">
                <Lock className="h-4 w-4 shrink-0" />
              <span>
                {t("provStaff_planLimitReachedThe")} <strong>{planLabel}</strong> {t("provStaff_planLimitOf")}{" "}
                <strong>{staffLimit === Infinity ? "\u221e" : staffLimit} {t(staffLimit === 1 ? "provStaff_staffMember" : "provStaff_staffMembers")}</strong>.
                {nextPlan && ` ${t("provStaff_planLimitUpgrade", { plan: PLAN_LABELS[nextPlan] })}`}
              </span>
              </div>
              {nextPlan && (
                <a
                  href="/provider/business/plan"
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  {t("provStaff_btnUpgrade")} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Invite form */}
          {showInvite && (
            <div className="bg-white border border-primary/20 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-800">{t("provStaff_inviteTitle")}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t("provStaff_inviteDesc")}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("provStaff_emailLabel")}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      className="input w-full pl-9"
                      type="email"
                      placeholder="staff@example.com"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSearch()}
                    />
                  </div>
                  <button
                    onClick={handleEmailSearch}
                    disabled={searchLoading || !searchEmail.trim()}
                    className="btn-secondary flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Search className="h-4 w-4" />
                    {searchLoading ? t("provStaff_btnSearching") : t("provStaff_btnSearch")}
                  </button>
                </div>
              </div>

              {searchResult === "notfound" && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {t("provStaff_notFound")}
                </div>
              )}

              {searchResult && searchResult !== "notfound" && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={searchResult.name} avatar={searchResult.avatar} size="md" />
                    <div><p className="font-semibold text-slate-800">{searchResult.name}</p><p className="text-xs text-slate-400">{searchResult.email}</p></div>
                    <CheckCircle className="h-5 w-5 text-emerald-500 ml-auto" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t("provStaff_roleLabel")}</label>
                    <select className="input w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as StaffRole)}>
                      <option value="worker">{t("provStaff_roleWorker")}</option>
                      <option value="dispatcher">{t("provStaff_roleDispatcher")}</option>
                      <option value="supervisor">{t("provStaff_roleSupervisor")}</option>
                      <option value="finance">{t("provStaff_roleFinance")}</option>
                    </select>
                  </div>

                  <button onClick={handleInvite} disabled={saving} className="btn-primary">
                    {saving ? t("provStaff_btnAdding") : t("provStaff_btnAddAs", { role: ROLE_LABELS[inviteRole] })}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Team search */}
          {staff.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="input w-full pl-9 text-sm"
                placeholder={t("provStaff_searchPlaceholder")}
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
              />
            </div>
          )}

          {/* Staff list */}
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">{t("provStaff_emptyNoStaff")}</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
              <Search className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">{t("provStaff_emptyNoMatch", { search: teamSearch })}</p>
              <button onClick={() => setTeamSearch("")} className="text-xs text-primary hover:underline">{t("provStaff_clearSearch")}</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((m) => {
                const u = staffUser(m, t("provStaff_unknown"));
                const Icon = ROLE_ICONS[m.role];
                const isEditing = editingRole?.id === m._id;

                return (
                  <div key={m._id} className={`bg-white border rounded-2xl transition-all ${isEditing ? "border-primary/30 shadow-sm" : "border-slate-200"}`}>
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      <Avatar name={u.name} avatar={u.avatar} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                        <Icon className="h-3 w-3" />{ROLE_LABELS[m.role]}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditingRole(isEditing ? null : { id: m._id, role: m.role })}
                          className={`p-2 rounded-xl transition-colors ${isEditing ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-400"}`}
                          title="Change role"
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                        {confirmRemoveId === m._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemove(m._id)}
                              className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemoveId(m._id)}
                            className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove staff"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline role editor */}
                    {isEditing && (
                      <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/60">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t("provStaff_changeRoleLabel")}</label>
                        <div className="flex gap-2 flex-wrap">
                          {(["worker","dispatcher","supervisor","finance"] as StaffRole[]).map((r) => {
                            const RIcon = ROLE_ICONS[r];
                            return (
                              <button
                                key={r}
                                onClick={() => handleUpdateRole(m._id, r)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                  m.role === r
                                    ? `${ROLE_COLORS[r]} border-current/20 ring-2 ring-current/20`
                                    : "border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <RIcon className="h-3.5 w-3.5" />{ROLE_LABELS[r]}
                                {m.role === r && <CheckCircle className="h-3 w-3 ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={() => setEditingRole(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                          <X className="h-3 w-3" /> {t("provStaff_btnClose")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ SCHEDULE TAB ══════════════ */}
      {tab === "schedule" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-5 text-center">
          <div className="bg-primary/5 ring-4 ring-primary/10 p-4 rounded-2xl">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">{t("provStaff_scheduleTitle")}</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              {t("provStaff_scheduleDesc")}
            </p>
          </div>
          <a
            href="/provider/business/schedule"
            className="btn-primary flex items-center gap-2"
          >
            {t("provStaff_scheduleManage")} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* ══════════════ PERFORMANCE TAB ══════════════ */}
      {tab === "performance" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-800">{t("provStaff_perfTitle")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{t("provStaff_perfDesc")}</p>
            </div>
            <button
              onClick={() => { setPerfStats([]); }}
              className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> {t("provStaff_btnRefresh")}
            </button>
          </div>
          {perfLoading ? (
            <div className="animate-pulse p-4 space-y-2">
              {[...Array(staff.length || 3)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BarChart2 className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">{t("provStaff_noStaffData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">{t("provStaff_colNum")}</th>
                    <th className="text-left px-5 py-3">{t("provStaff_colStaff")}</th>
                    <th className="text-left px-5 py-3">{t("provStaff_colRole")}</th>
                    <th className="text-right px-5 py-3">{t("provStaff_colCompleted")}</th>
                    <th className="text-right px-5 py-3">{t("provStaff_colInProgress")}</th>
                    <th className="text-right px-5 py-3">{t("provStaff_colRating")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staff.map((m, i) => {
                    const u = staffUser(m, t("provStaff_unknown"));
                    const Icon = ROLE_ICONS[m.role];
                    const s = perfMap[u._id];
                    return (
                      <tr key={m._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-[11px] font-bold text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={u.name} avatar={u.avatar} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-700 leading-tight">{u.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${ROLE_COLORS[m.role]}`}>
                            <Icon className="h-3 w-3" />{ROLE_LABELS[m.role]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {s ? (
                            <span className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-700">
                              <TrendingUp className="h-3 w-3" />{s.completed}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {s ? (
                            <span className="text-xs font-semibold text-amber-600">{s.inProgress}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {s?.avgRating != null ? (
                            <span className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-500">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {s.avgRating.toFixed(1)}
                              <span className="text-[10px] text-slate-400 font-normal">({s.reviewCount})</span>
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
