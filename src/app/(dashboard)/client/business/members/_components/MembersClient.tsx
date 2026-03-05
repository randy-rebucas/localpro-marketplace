"use client";

import { useEffect, useState, type ElementType } from "react";
import {
  Users, Plus, Trash2, Shield, User,
  Crown, Briefcase, Eye, Coins, ChevronDown,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization, IBusinessMember, BusinessMemberRole } from "@/types";
import toast from "react-hot-toast";

const ROLE_LABELS: Record<BusinessMemberRole, string> = {
  owner:      "Owner",
  manager:    "Manager",
  supervisor: "Supervisor",
  finance:    "Finance",
};

const ROLE_COLORS: Record<BusinessMemberRole, string> = {
  owner:      "bg-yellow-100 text-yellow-700",
  manager:    "bg-blue-100 text-blue-700",
  supervisor: "bg-violet-100 text-violet-700",
  finance:    "bg-emerald-100 text-emerald-700",
};

const ROLE_ICONS: Record<BusinessMemberRole, ElementType> = {
  owner:      Crown,
  manager:    Briefcase,
  supervisor: Eye,
  finance:    Coins,
};

const ROLE_RING: Record<BusinessMemberRole, string> = {
  owner:      "bg-yellow-50 ring-yellow-100 text-yellow-600",
  manager:    "bg-blue-50 ring-blue-100 text-blue-600",
  supervisor: "bg-violet-50 ring-violet-100 text-violet-600",
  finance:    "bg-emerald-50 ring-emerald-100 text-emerald-600",
};

const ROLE_DESCS: Record<BusinessMemberRole, string> = {
  owner:      "Full access. Can manage everything including org settings.",
  manager:    "Can add/remove members, update locations, and view all analytics.",
  supervisor: "Read-only access to assigned locations and analytics.",
  finance:    "Can release escrow payments. Cannot manage members or org settings.",
};

export default function MembersClient() {
  const [org, setOrg] = useState<IBusinessOrganization | null>(null);
  const [members, setMembers] = useState<IBusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ userId: "", role: "supervisor" as "manager" | "supervisor" | "finance" });
  const [editingMember, setEditingMember] = useState<IBusinessMember | null>(null);

  async function load() {
    setLoading(true);
    try {
      const orgData = await fetchClient<{ org: IBusinessOrganization | null }>("/api/business/org");
      if (!orgData.org) { setLoading(false); return; }
      setOrg(orgData.org);
      const membersData = await fetchClient<{ members: IBusinessMember[] }>(
        `/api/business/members?orgId=${orgData.org._id}`
      );
      setMembers(membersData.members);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAddMember() {
    if (!org || !form.userId.trim()) return toast.error("User ID is required.");
    setSaving(true);
    try {
      await fetchClient<{ member: IBusinessMember }>("/api/business/members", {
        method: "POST",
        body: JSON.stringify({ orgId: org._id, userId: form.userId.trim(), role: form.role }),
      });
      toast.success("Member added successfully.");
      setShowForm(false);
      setForm({ userId: "", role: "supervisor" });
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRole(member: IBusinessMember, role: "manager" | "supervisor" | "finance") {
    if (!org) return;
    try {
      await fetchClient("/api/business/members", {
        method: "PATCH",
        body: JSON.stringify({ orgId: org._id, memberId: member._id, role }),
      });
      await load();
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function handleRemove(member: IBusinessMember) {
    if (!org) return;
    if (!confirm("Remove this member?")) return;
    try {
      await fetchClient(
        `/api/business/members?orgId=${org._id}&memberId=${member._id}`,
        { method: "DELETE" }
      );
      await load();
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
    }
  }

  const memberUser = (m: IBusinessMember) =>
    m.userId as { name?: string; email?: string; avatar?: string };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-48 bg-slate-200 rounded-lg" />
        <div className="grid sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[72px] bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Users className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile found.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const roleCounts = members.reduce(
    (acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; },
    {} as Record<BusinessMemberRole, number>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500 mt-0.5">{org.name}</p>
        </div>
        <button
          onClick={() => { setEditingMember(null); setShowForm((v) => !v); }}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add Member"}
        </button>
      </div>

      {/* ── Role guide cards ── */}
      <div className="grid sm:grid-cols-4 gap-3">
        {(["owner", "manager", "supervisor", "finance"] as BusinessMemberRole[]).map((role) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ring-4 ${ROLE_RING[role]}`}>
                  <Icon className="h-4 w-4" />
                </div>
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

      {/* ── Add member form ── */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-800">Invite Team Member</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the User ID of an existing LocalPro client to add them to your org.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                User ID *
              </label>
              <input
                className="input w-full font-mono text-sm"
                placeholder="MongoDB ObjectId of the user"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                className="input w-full"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}
              >
                <option value="manager">Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="finance">Finance</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddMember} disabled={saving} className="btn-primary">
              {saving ? "Adding…" : "Add Member"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ userId: "", role: "supervisor" }); }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Members list ── */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">No team members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const u   = memberUser(m);
            const Icon = ROLE_ICONS[m.role];
            const isEditing = editingMember?._id === m._id;

            return (
              <div
                key={m._id.toString()}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3"
              >
                {/* Avatar */}
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.avatar}
                    alt="avatar"
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-100">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{u.name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>

                {/* Role pill */}
                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                  <Icon className="h-3 w-3" />
                  {ROLE_LABELS[m.role]}
                </div>

                {/* Actions */}
                {m.role !== "owner" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingMember(isEditing ? null : m)}
                      className={`p-2 rounded-xl transition-colors ${
                        isEditing
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-slate-100 text-slate-400"
                      }`}
                      title="Change role"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(m)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Inline role editor (rendered below the selected member) ── */}
      {editingMember && (
        <div className="bg-white border border-primary/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Change role for {(editingMember.userId as { name?: string }).name ?? "member"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Current: <span className="font-medium text-slate-600">{ROLE_LABELS[editingMember.role]}</span>
              </p>
            </div>
            <button
              onClick={() => setEditingMember(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["manager", "supervisor", "finance"] as const)
              .filter((r) => r !== editingMember.role)
              .map((r) => {
                const RIcon = ROLE_ICONS[r];
                return (
                  <button
                    key={r}
                    onClick={() => { handleUpdateRole(editingMember, r); setEditingMember(null); }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${ROLE_COLORS[r]} border-current/20 hover:opacity-80`}
                  >
                    <RIcon className="h-3.5 w-3.5" />
                    {ROLE_LABELS[r]}
                    <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
