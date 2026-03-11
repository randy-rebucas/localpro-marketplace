"use client";

import { useEffect, useState, useCallback, type ElementType } from "react";
import Image from "next/image";
import {
  Users, Plus, Trash2, Eye, Coins, RefreshCw, Search,
  CheckCircle, AlertCircle, Mail, X, CalendarDays, BarChart2,
  Wrench, Navigation, Star, ArrowRight, TrendingUp,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffRole = "worker" | "dispatcher" | "supervisor" | "finance";
type Tab = "team" | "schedule" | "performance";

interface AgencyProfile {
  _id: string;
  name: string;
  type: string;
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

const ROLE_LABELS: Record<StaffRole, string> = {
  worker: "Worker", dispatcher: "Dispatcher", supervisor: "Supervisor", finance: "Finance",
};

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

const ROLE_DESCS: Record<StaffRole, string> = {
  worker: "Field service worker. Receives and completes job assignments from dispatchers.",
  dispatcher: "Assigns and manages job dispatch. Coordinates field workers and schedules.",
  supervisor: "Read-only oversight of all staff activity and job progress.",
  finance: "Views earnings and payment summaries. Cannot manage staff or dispatch jobs.",
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

function staffUser(m: StaffMember) {
  if (typeof m.userId === "object" && m.userId !== null) return m.userId as { _id: string; name: string; email: string; avatar?: string | null };
  return { _id: String(m.userId), name: "Unknown", email: "", avatar: null };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffClient() {
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
    } catch { toast.error("Failed to load staff."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load performance stats when performance tab opens
  useEffect(() => {
    if (tab !== "performance" || perfStats.length > 0) return;
    setPerfLoading(true);
    fetchClient<{ stats: StaffStat[] }>("/api/provider/agency/staff/performance")
      .then((d) => setPerfStats(d.stats))
      .catch(() => toast.error("Failed to load performance data."))
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
    } catch { toast.error("Search failed."); setSearchResult("notfound"); }
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
      toast.success(`${searchResult.name} added as ${ROLE_LABELS[inviteRole]}.`);
      setShowInvite(false);
      setSearchEmail(""); setSearchResult(null); setInviteRole("worker");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add staff.");
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
      toast.success("Role updated.");
    } catch { toast.error("Update failed."); }
  }

  async function handleRemove(staffId: string) {
    if (!agency) return;
    setConfirmRemoveId(null);
    try {
      await fetchClient(`/api/provider/agency/staff?agencyId=${agency._id}&staffId=${staffId}`, { method: "DELETE" });
      await load(); setPerfStats([]);
      toast.success("Staff member removed.");
    } catch { toast.error("Remove failed."); }
  }

  const roleCounts = staff.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<StaffRole, number>);
  const filteredStaff = teamSearch.trim()
    ? staff.filter((m) => {
        const u = staffUser(m);
        const q = teamSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
    : staff;
  const perfMap = Object.fromEntries(perfStats.map((s) => [s.userId, s]));

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
      <p className="text-slate-500">No agency profile found. <a href="/provider/business" className="text-primary underline">Create one first.</a></p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">{agency.name} · {staff.length} staff member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          {tab === "team" && (
            <button
              onClick={() => { setShowInvite((v) => !v); setSearchEmail(""); setSearchResult(null); }}
              className="btn-primary flex items-center gap-2"
            >
              {showInvite ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showInvite ? "Cancel" : "Add Staff"}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: "team",        icon: Users,       label: "Team"        },
          { id: "schedule",    icon: CalendarDays, label: "Schedule"   },
          { id: "performance", icon: BarChart2,    label: "Performance" },
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

          {/* Invite form */}
          {showInvite && (
            <div className="bg-white border border-primary/20 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-800">Add Staff Member</h2>
                <p className="text-xs text-slate-400 mt-0.5">Search by email to find and add an existing LocalPro user as staff.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
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
                    {searchLoading ? "Searching…" : "Search"}
                  </button>
                </div>
              </div>

              {searchResult === "notfound" && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  No user found with that email address.
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
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
                    <select className="input w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as StaffRole)}>
                      <option value="worker">Worker</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>

                  <button onClick={handleInvite} disabled={saving} className="btn-primary">
                    {saving ? "Adding…" : `Add as ${ROLE_LABELS[inviteRole]}`}
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
                placeholder="Search by name or email…"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
              />
            </div>
          )}

          {/* Staff list */}
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No staff members yet. Add someone to get started.</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200 gap-2">
              <Search className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">No staff match &ldquo;{teamSearch}&rdquo;.</p>
              <button onClick={() => setTeamSearch("")} className="text-xs text-primary hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map((m) => {
                const u = staffUser(m);
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
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Change Role</label>
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
                          <X className="h-3 w-3" /> Close
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
            <h3 className="font-semibold text-slate-800">Agency Schedule & Availability</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Set your agency’s working hours, open days, and availability windows.
            </p>
          </div>
          <a
            href="/provider/business/schedule"
            className="btn-primary flex items-center gap-2"
          >
            Manage Schedule <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* ══════════════ PERFORMANCE TAB ══════════════ */}
      {tab === "performance" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-800">Staff Performance</h2>
              <p className="text-xs text-slate-400 mt-0.5">Completed jobs, ratings, and activity per staff member.</p>
            </div>
            <button
              onClick={() => { setPerfStats([]); }}
              className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          {perfLoading ? (
            <div className="animate-pulse p-4 space-y-2">
              {[...Array(staff.length || 3)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BarChart2 className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-400">No staff data to display.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">#</th>
                    <th className="text-left px-5 py-3">Staff</th>
                    <th className="text-left px-5 py-3">Role</th>
                    <th className="text-right px-5 py-3">Completed</th>
                    <th className="text-right px-5 py-3">In Progress</th>
                    <th className="text-right px-5 py-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staff.map((m, i) => {
                    const u = staffUser(m);
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
