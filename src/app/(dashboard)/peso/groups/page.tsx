"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  UsersRound, Plus, Hammer, Brush, Wrench, Leaf, Sparkles,
  Search, X, Pencil, Trash2, ChevronDown, Loader2, Users,
  Phone, MapPin, FileText, ToggleLeft, ToggleRight, Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LivelihoodGroup {
  _id: string;
  name: string;
  type: string;
  barangay: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  memberCount: number;
  status: "active" | "inactive";
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_TYPES = [
  "Cleaning", "Construction", "Landscaping", "Electrical",
  "Plumbing", "Carpentry", "Welding", "Tailoring", "Food Service",
  "Agriculture", "Handicraft", "Other",
];

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Cleaning:     { icon: <Brush className="h-4 w-4" />,    color: "text-sky-700",     bg: "bg-sky-100"     },
  Construction: { icon: <Hammer className="h-4 w-4" />,   color: "text-orange-700",  bg: "bg-orange-100"  },
  Landscaping:  { icon: <Leaf className="h-4 w-4" />,     color: "text-emerald-700", bg: "bg-emerald-100" },
  Electrical:   { icon: <Sparkles className="h-4 w-4" />, color: "text-yellow-700",  bg: "bg-yellow-100"  },
  Agriculture:  { icon: <Leaf className="h-4 w-4" />,     color: "text-green-700",   bg: "bg-green-100"   },
};
const FALLBACK_META = { icon: <Wrench className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-100" };

const EMPTY_FORM = {
  name: "", type: "", barangay: "", description: "",
  contactPerson: "", contactPhone: "", memberCount: 0, status: "active" as "active" | "inactive",
};

const INPUT_CLS = "mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400 bg-white transition";
const LABEL_CLS = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

// ─── Component ────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const [groups, setGroups] = useState<LivelihoodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "active" | "inactive">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LivelihoodGroup | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LivelihoodGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  async function loadGroups() {
    try {
      const res = await apiFetch("/api/peso/groups");
      const d = await res.json();
      setGroups(d.data ?? []);
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  // Close drawer on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Drawer helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEdit(g: LivelihoodGroup) {
    setEditing(g);
    setForm({
      name: g.name, type: g.type, barangay: g.barangay,
      description: g.description ?? "", contactPerson: g.contactPerson ?? "",
      contactPhone: g.contactPhone ?? "", memberCount: g.memberCount, status: g.status,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setEditing(null); }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.type || !form.barangay) {
      toast.error("Name, type, and barangay are required");
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, memberCount: Number(form.memberCount) };
      let res: Response;
      if (editing) {
        res = await apiFetch(`/api/peso/groups/${editing._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await apiFetch("/api/peso/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      toast.success(editing ? "Group updated" : "Group created");
      closeDrawer();
      loadGroups();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/peso/groups/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Group deleted");
      setDeleteTarget(null);
      setGroups((g) => g.filter((x) => x._id !== deleteTarget._id));
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = groups.filter((g) => {
    if (filterType && g.type !== filterType) return false;
    if (filterStatus && g.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.barangay.toLowerCase().includes(q) || g.type.toLowerCase().includes(q);
    }
    return true;
  });

  const totalMembers = groups.reduce((s, g) => s + g.memberCount, 0);
  const activeCount  = groups.filter((g) => g.status === "active").length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-blue-600" />
            Livelihood Groups
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage community cooperatives, construction teams, and livelihood groups.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Group
        </button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Groups",   value: groups.length, color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Active Groups",  value: activeCount,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Total Members",  value: totalMembers,  color: "text-violet-600",  bg: "bg-violet-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 text-center`}>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, type, or barangay…"
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
            showFilters || filterType || filterStatus
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {(filterType || filterStatus) && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {[filterType, filterStatus].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex-1 min-w-36">
            <label className={`${LABEL_CLS} mb-1 block`}>Type</label>
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 pr-8"
              >
                <option value="">All Types</option>
                {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className={`${LABEL_CLS} mb-1 block`}>Status</label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "" | "active" | "inactive")}
                className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 pr-8"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {(filterType || filterStatus) && (
            <div className="flex items-end">
              <button
                onClick={() => { setFilterType(""); setFilterStatus(""); }}
                className="text-xs text-slate-500 hover:text-red-500 transition-colors py-2"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded w-full" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 flex flex-col items-center gap-3 text-slate-400">
          <UsersRound className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">
            {search || filterType || filterStatus
              ? "No groups match your filters."
              : "No livelihood groups yet."}
          </p>
          {!search && !filterType && !filterStatus && (
            <button
              onClick={openCreate}
              className="text-xs text-blue-500 hover:underline font-medium"
            >
              Create your first group
            </button>
          )}
        </div>
      ) : (
        <>
          {(search || filterType || filterStatus) && (
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((group) => {
              const meta = TYPE_META[group.type] ?? FALLBACK_META;
              return (
                <div
                  key={group._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:border-slate-300 hover:shadow transition-all"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl ${meta.bg} ${meta.color} shrink-0`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm leading-snug truncate">{group.name}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{group.barangay}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                        group.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {group.status}
                      </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{group.description}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className={`font-semibold ${meta.color}`}>{group.type}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    </span>
                    {group.contactPerson && (
                      <span className="flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 shrink-0" />
                        {group.contactPerson}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(group)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(group)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Create / Edit Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closeDrawer} />
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {editing ? "Edit Group" : "New Livelihood Group"}
              </h2>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer form */}
            <form id="group-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className={LABEL_CLS}>Group Name <span className="text-red-400 normal-case font-normal">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Poblacion Cleaning Cooperative"
                  className={INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Type <span className="text-red-400 normal-case font-normal">*</span></label>
                  <div className="relative mt-1">
                    <select
                      required
                      value={form.type}
                      onChange={(e) => set("type", e.target.value)}
                      className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 pr-8"
                    >
                      <option value="">Select…</option>
                      {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Barangay <span className="text-red-400 normal-case font-normal">*</span></label>
                  <input
                    required
                    value={form.barangay}
                    onChange={(e) => set("barangay", e.target.value)}
                    placeholder="e.g. Poblacion"
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL_CLS}>Description</label>
                  <span className={`text-[11px] tabular-nums ${form.description.length > 450 ? "text-red-500" : "text-slate-400"}`}>
                    {form.description.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Brief description of the group's purpose and activities…"
                  className={`${INPUT_CLS} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Contact Person</label>
                  <input
                    value={form.contactPerson}
                    onChange={(e) => set("contactPerson", e.target.value)}
                    placeholder="Full name"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Contact Phone</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    placeholder="09xx-xxx-xxxx"
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Member Count</label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={form.memberCount}
                    onChange={(e) => set("memberCount", Number(e.target.value))}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={`${LABEL_CLS} mb-1 block`}>Status</label>
                  <button
                    type="button"
                    onClick={() => set("status", form.status === "active" ? "inactive" : "active")}
                    className={`mt-1 flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      form.status === "active"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    {form.status === "active"
                      ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                      : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    {form.status === "active" ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            </form>

            {/* Drawer footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="group-form"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Group"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Group</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteTarget.name}</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



