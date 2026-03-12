"use client";

import { useEffect, useState, useCallback, type ElementType } from "react";
import Image from "next/image";
import {
  Users, Plus, Trash2, Shield, User, Crown, Briefcase, Eye, Coins,
  RefreshCw, Search, CheckCircle, AlertCircle, Lock,
  Activity, Mail, MapPin, Building2, X, ChevronRight, Clock,
  KeyRound, BarChart2, Settings,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization, IBusinessMember, BusinessMemberRole } from "@/types";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityLogEntry {
  logId: string;
  eventType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  user: { id: string; name: string; avatar: string | null } | null;
  job: { id: string; title: string; category: string | null } | null;
}

interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
}

type Tab = "team" | "activity" | "security";

const ROLE_LABELS: Record<BusinessMemberRole, string> = {
  owner: "Owner", manager: "Manager", supervisor: "Supervisor", finance: "Finance",
};
const ROLE_COLORS: Record<BusinessMemberRole, string> = {
  owner: "bg-yellow-100 text-yellow-700", manager: "bg-blue-100 text-blue-700",
  supervisor: "bg-violet-100 text-violet-700", finance: "bg-emerald-100 text-emerald-700",
};
const ROLE_ICONS: Record<BusinessMemberRole, ElementType> = {
  owner: Crown, manager: Briefcase, supervisor: Eye, finance: Coins,
};
const ROLE_RING: Record<BusinessMemberRole, string> = {
  owner: "bg-yellow-50 ring-yellow-100 text-yellow-600", manager: "bg-blue-50 ring-blue-100 text-blue-600",
  supervisor: "bg-violet-50 ring-violet-100 text-violet-600", finance: "bg-emerald-50 ring-emerald-100 text-emerald-600",
};
const ROLE_DESCS: Record<BusinessMemberRole, string> = {
  owner: "Full access. Manages org settings, members, escrow, and billing.",
  manager: "Add/remove members, update branches, view all analytics and reports.",
  supervisor: "Read-only access to assigned branches and job overview.",
  finance: "Can approve and release escrow payments. Cannot manage members.",
};

const EVENT_LABELS: Record<string, string> = {
  job_created: "Created job", job_approved: "Approved job", job_rejected: "Rejected job",
  quote_submitted: "Submitted quote", quote_accepted: "Accepted quote",
  escrow_funded: "Funded escrow", job_started: "Started job", job_completed: "Completed job",
  escrow_released: "Released escrow", dispute_opened: "Opened dispute",
  dispute_resolved: "Resolved dispute", review_submitted: "Submitted review",
  job_expired: "Job expired", payout_requested: "Requested payout",
  recurring_created: "Created recurring job", recurring_cancelled: "Cancelled recurring",
};
const EVENT_COLOR: Record<string, string> = {
  job_created: "text-blue-600 bg-blue-50", escrow_funded: "text-amber-600 bg-amber-50",
  escrow_released: "text-emerald-600 bg-emerald-50", dispute_opened: "text-red-600 bg-red-50",
  dispute_resolved: "text-emerald-600 bg-emerald-50", job_completed: "text-emerald-600 bg-emerald-50",
  job_rejected: "text-red-600 bg-red-50",
};

function Avatar({ name, avatar, size = "sm" }: { name?: string; avatar?: string | null; size?: "sm" | "md" }) {
  const sz = size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  if (avatar) return (
    <Image src={avatar} alt={name ?? ""} width={size === "md" ? 36 : 28} height={size === "md" ? 36 : 28}
      className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100`} />
  );
  return (
    <div className={`${sz} rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-500 flex-shrink-0 ring-2 ring-slate-100`}>
      {name ? name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
    </div>
  );
}

export default function MembersClient() {
  const [org, setOrg]                     = useState<IBusinessOrganization | null>(null);
  const [members, setMembers]             = useState<IBusinessMember[]>([]);
  const [logs, setLogs]                   = useState<ActivityLogEntry[]>([]);
  const [logsTotal, setLogsTotal]         = useState(0);
  const [logsPage, setLogsPage]           = useState(1);
  const [tab, setTab]                     = useState<Tab>("team");
  const [loading, setLoading]             = useState(true);
  const [logsLoading, setLogsLoading]     = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [editMember, setEditMember]       = useState<IBusinessMember | null>(null);
  const [searchEmail, setSearchEmail]     = useState("");
  const [searchResult, setSearchResult]   = useState<UserSearchResult | null | "notfound">(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteRole, setInviteRole]       = useState<"manager" | "supervisor" | "finance">("supervisor");
  const [inviteAccess, setInviteAccess]   = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const mData = await fetchClient<{ members: IBusinessMember[] }>(
        `/api/business/members?orgId=${orgData.org._id}`
      );
      setMembers(mData.members);
    } catch { toast.error("Failed to load members."); }
    finally { setLoading(false); }
  }, []);

  const loadLogs = useCallback(async (orgId: string, page = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetchClient<{ logs: ActivityLogEntry[]; total: number }>(
        `/api/business/members/activity?orgId=${orgId}&page=${page}&limit=20`
      );
      setLogs(res.logs);
      setLogsTotal(res.total);
    } catch { toast.error("Failed to load activity logs."); }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === "activity" && org) loadLogs(org._id.toString(), logsPage);
  }, [tab, org, logsPage, loadLogs]);

  async function handleEmailSearch() {
    if (!org || !searchEmail.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await fetchClient<{ user: UserSearchResult | null }>(
        `/api/business/members?orgId=${org._id}&searchEmail=${encodeURIComponent(searchEmail.trim())}`
      );
      setSearchResult(res.user ?? "notfound");
    } catch { toast.error("Search failed."); setSearchResult("notfound"); }
    finally { setSearchLoading(false); }
  }

  async function handleInvite() {
    if (!org || !searchResult || searchResult === "notfound") return;
    setSaving(true);
    try {
      await fetchClient("/api/business/members", {
        method: "POST",
        body: JSON.stringify({ orgId: org._id, userId: searchResult._id, role: inviteRole, locationAccess: inviteAccess }),
      });
      toast.success(`${searchResult.name} added as ${ROLE_LABELS[inviteRole]}.`);
      setShowInvite(false);
      setSearchEmail(""); setSearchResult(null);
      setInviteRole("supervisor"); setInviteAccess([]);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add member.");
    } finally { setSaving(false); }
  }

  async function handleUpdateMember(member: IBusinessMember, role?: BusinessMemberRole, locationAccess?: string[]) {
    if (!org) return;
    try {
      await fetchClient("/api/business/members", {
        method: "PATCH",
        body: JSON.stringify({
          orgId: org._id,
          memberId: member._id,
          ...(role !== undefined && { role }),
          ...(locationAccess !== undefined && { locationAccess }),
        }),
      });
      await load(); setEditMember(null);
      toast.success("Member updated.");
    } catch { toast.error("Update failed."); }
  }

  async function handleRemove(member: IBusinessMember) {
    if (!org) return;
    if (member.role === "owner" && members.filter((m) => m.role === "owner").length <= 1) {
      toast.error("Cannot remove the last owner of the organization.");
      return;
    }
    try {
      await fetchClient(`/api/business/members?orgId=${org._id}&memberId=${member._id}`, { method: "DELETE" });
      await load(); toast.success("Member removed.");
    } catch { toast.error("Remove failed."); }
  }

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const mu = (m: IBusinessMember) => m.userId as { name?: string; email?: string; avatar?: string; isVerified?: boolean; isSuspended?: boolean };

  const roleCounts = members.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<BusinessMemberRole, number>);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-9 w-52 bg-slate-200 rounded-lg" />
      <div className="grid sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}</div>
      <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-[72px] bg-slate-200 rounded-2xl" />)}</div>
    </div>
  );

  if (!org) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <Users className="h-10 w-10 text-slate-300" />
      <p className="text-slate-500">No business profile found. <a href="/client/business" className="text-primary underline">Create one first.</a></p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">User &amp; Role Management</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{org.name} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} title="Refresh" aria-label="Refresh" className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {tab === "team" && (
            <button
              onClick={() => { setShowInvite((v) => !v); setSearchEmail(""); setSearchResult(null); }}
              className="btn-primary flex items-center gap-2"
            >
              {showInvite ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showInvite ? "Cancel" : "Invite User"}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: "team",     icon: Users,     label: "Team"     },
          { id: "activity", icon: Activity,  label: "Activity" },
          { id: "security", icon: Shield,    label: "Security" },
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
            {(["owner","manager","supervisor","finance"] as BusinessMemberRole[]).map((role) => {
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
                <h2 className="font-semibold text-slate-800">Invite Team Member</h2>
                <p className="text-xs text-slate-400 mt-0.5">Search by email to find and invite an existing LocalPro client.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      className="input w-full pl-9"
                      type="email"
                      placeholder="user@example.com"
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
                  No client account found with that email.
                </div>
              )}

              {searchResult && searchResult !== "notfound" && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={searchResult.name} avatar={searchResult.avatar} size="md" />
                    <div><p className="font-semibold text-slate-800">{searchResult.name}</p><p className="text-xs text-slate-400">{searchResult.email}</p></div>
                    <CheckCircle className="h-5 w-5 text-emerald-500 ml-auto" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
                      <select className="input w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
                        <option value="manager">Manager</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="finance">Finance</option>
                      </select>
                    </div>
                    {org.locations.filter((l) => l.isActive).length > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Branch Access <span className="normal-case font-normal">(empty = all)</span>
                        </label>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {org.locations.filter((l) => l.isActive).map((loc) => {
                            const lid = loc._id.toString();
                            return (
                              <label key={lid} className="flex items-center gap-2 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={inviteAccess.includes(lid)}
                                  onChange={(e) => setInviteAccess(e.target.checked ? [...inviteAccess, lid] : inviteAccess.filter((x) => x !== lid))}
                                  className="rounded border-slate-300 text-primary"
                                />
                                <Building2 className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-700">{loc.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleInvite} disabled={saving} className="btn-primary">
                    {saving ? "Adding…" : `Add as ${ROLE_LABELS[inviteRole]}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No team members yet. Invite someone to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const u    = mu(m);
                const Icon = ROLE_ICONS[m.role];
                const isEditing = editMember?._id === m._id;
                const locationCount = m.locationAccess?.length ?? 0;

                return (
                  <div key={m._id.toString()} className={`bg-white border rounded-2xl transition-all ${isEditing ? "border-primary/30 shadow-sm" : "border-slate-200"}`}>
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      <Avatar name={u.name} avatar={u.avatar} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{u.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {locationCount === 0 ? "All branches" : `${locationCount} branch${locationCount !== 1 ? "es" : ""}`}
                      </div>
                      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                        <Icon className="h-3 w-3" />{ROLE_LABELS[m.role]}
                      </div>
                      {m.role !== "owner" && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditMember(isEditing ? null : m)}
                            className={`p-2 rounded-xl transition-colors ${isEditing ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-400"}`}
                            title="Edit member"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          {confirmRemoveId === m._id.toString() ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setConfirmRemoveId(null); handleRemove(m); }}
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
                              onClick={() => setConfirmRemoveId(m._id.toString())}
                              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline editor */}
                    {isEditing && m.role !== "owner" && (
                      <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/60">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                            <div className="flex gap-2 flex-wrap">
                              {(["manager","supervisor","finance"] as const).map((r) => {
                                const RIcon = ROLE_ICONS[r];
                                return (
                                  <button
                                    key={r}
                                    onClick={() => handleUpdateMember(m, r)}
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
                          </div>
                          {org.locations.filter((l) => l.isActive).length > 0 && (
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Branch Access <span className="normal-case font-normal">(empty = all)</span>
                              </label>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {org.locations.filter((l) => l.isActive).map((loc) => {
                                  const lid = loc._id.toString();
                                  const current = m.locationAccess?.map((x) => x.toString()) ?? [];
                                  return (
                                    <label key={lid} className="flex items-center gap-2 cursor-pointer text-xs">
                                      <input
                                        type="checkbox"
                                        defaultChecked={current.includes(lid)}
                                        onChange={(e) => handleUpdateMember(m, undefined,
                                          e.target.checked ? [...current, lid] : current.filter((x) => x !== lid)
                                        )}
                                        className="rounded border-slate-300 text-primary"
                                      />
                                      <Building2 className="h-3 w-3 text-slate-400" />
                                      <span className="text-slate-700">{loc.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setEditMember(null)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
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

      {/* ══════════════ ACTIVITY TAB ══════════════ */}
      {tab === "activity" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Activity Log</h2>
              <p className="text-xs text-slate-400 mt-0.5">All org member actions · {logsTotal} total entries</p>
            </div>
            <button
              onClick={() => org && loadLogs(org._id.toString(), logsPage)}
              disabled={logsLoading}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {logsLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <Activity className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No activity recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Date</th>
                      <th className="text-left px-5 py-3">Member</th>
                      <th className="text-left px-5 py-3">Event</th>
                      <th className="text-left px-5 py-3">Job</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.map((log) => {
                      const eventColor = EVENT_COLOR[log.eventType] ?? "text-slate-600 bg-slate-100";
                      return (
                        <tr key={log.logId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap tabular-nums text-xs">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                              {" · "}
                              {new Date(log.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={log.user.name} avatar={log.user.avatar} size="sm" />
                                <span className="text-slate-700 font-medium text-xs">{log.user.name}</span>
                              </div>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${eventColor}`}>
                              {EVENT_LABELS[log.eventType] ?? log.eventType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 truncate max-w-[160px]">
                            {log.job ? (
                              <a href={`/client/jobs/${log.job.id}`} className="hover:text-primary flex items-center gap-1">
                                {log.job.title} <ChevronRight className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {logsTotal > 20 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>Page {logsPage} of {Math.ceil(logsTotal / 20)}</span>
                  <div className="flex gap-2">
                    <button disabled={logsPage <= 1} onClick={() => { const p = logsPage - 1; setLogsPage(p); org && loadLogs(org._id.toString(), p); }}
                      className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">Prev</button>
                    <button disabled={logsPage >= Math.ceil(logsTotal / 20)} onClick={() => { const p = logsPage + 1; setLogsPage(p); org && loadLogs(org._id.toString(), p); }}
                      className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════ SECURITY TAB ══════════════ */}
      {tab === "security" && (
        <div className="space-y-5">

          {/* Member security posture */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Account Security Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Verification and access status per team member.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {members.map((m) => {
                const u = mu(m);
                const Icon = ROLE_ICONS[m.role];
                return (
                  <div key={m._id.toString()} className="px-5 py-3.5 flex items-center gap-4 flex-wrap">
                    <Avatar name={u.name} avatar={u.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{u.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                      <Icon className="h-3 w-3" />{ROLE_LABELS[m.role]}
                    </div>
                    <div className="flex items-center gap-2">
                      {u.isVerified !== false ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" /> Unverified
                        </span>
                      )}
                      {u.isSuspended && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <Lock className="h-3 w-3" /> Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <KeyRound className="h-3 w-3" /> 2FA: <span className="font-semibold text-slate-500 ml-0.5">N/A</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission audit matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Permission Audit Trail</h2>
              <p className="text-xs text-slate-400 mt-0.5">What each role can do in this organization.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Permission</th>
                    {(["owner","manager","supervisor","finance"] as BusinessMemberRole[]).map((r) => (
                      <th key={r} className="text-center px-4 py-3">{ROLE_LABELS[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { label: "Manage org settings",     owner: true,  manager: false, supervisor: false, finance: false },
                    { label: "Invite / remove members", owner: true,  manager: true,  supervisor: false, finance: false },
                    { label: "Manage branches",         owner: true,  manager: true,  supervisor: false, finance: false },
                    { label: "View all analytics",      owner: true,  manager: true,  supervisor: true,  finance: false },
                    { label: "Create / approve jobs",   owner: true,  manager: true,  supervisor: true,  finance: false },
                    { label: "View escrow",             owner: true,  manager: true,  supervisor: false, finance: true  },
                    { label: "Release escrow funds",    owner: true,  manager: false, supervisor: false, finance: true  },
                    { label: "Download invoices",       owner: true,  manager: true,  supervisor: false, finance: true  },
                    { label: "View disputes",           owner: true,  manager: true,  supervisor: true,  finance: true  },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-xs text-slate-700 font-medium">{row.label}</td>
                      {(["owner","manager","supervisor","finance"] as BusinessMemberRole[]).map((r) => (
                        <td key={r} className="text-center px-4 py-3">
                          {row[r as keyof typeof row]
                            ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                            : <X className="h-4 w-4 text-slate-200 mx-auto" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security info cards */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Security Features</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: KeyRound,  title: "Two-Factor Authentication", desc: "2FA is managed per-user in individual account settings.",     badge: "Per User" },
                { icon: BarChart2, title: "Login History",             desc: "Login sessions are tracked at the platform auth level.",     badge: "Platform" },
                { icon: Activity,  title: "Permission Audit Trail",    desc: "All role changes and actions are logged in the Activity tab.", badge: "Active" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-4 space-y-1.5 border border-blue-100">
                  <item.icon className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-slate-700">{item.title}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">{item.badge}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

