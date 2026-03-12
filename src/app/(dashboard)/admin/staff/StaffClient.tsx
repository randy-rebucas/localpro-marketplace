"use client";

import { useState } from "react";
import { UserCog, Plus, Pencil, Ban, CheckCircle2, X, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffCapability =
  | "manage_jobs"
  | "manage_kyc"
  | "manage_disputes"
  | "manage_users"
  | "manage_agencies"
  | "manage_businesses"
  | "view_revenue"
  | "manage_payouts"
  | "manage_categories"
  | "manage_support";

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  capabilities: string[];
  isSuspended: boolean;
  createdAt: string;
}

// ─── Capability metadata ──────────────────────────────────────────────────────

const CAPABILITY_META: Record<
  StaffCapability,
  { label: string; description: string; color: string }
> = {
  manage_jobs:       { label: "Manage Jobs",        description: "Approve or reject job postings",               color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  manage_kyc:        { label: "Manage KYC",         description: "Review provider KYC submissions",               color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  manage_disputes:   { label: "Manage Disputes",    description: "Resolve platform disputes",                     color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  manage_users:      { label: "Manage Users",       description: "Suspend or verify user accounts",               color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  manage_agencies:   { label: "Manage Agencies",    description: "View and manage provider agency accounts",      color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" },
  manage_businesses: { label: "Manage Businesses",  description: "View and manage client business organizations",  color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
  view_revenue:      { label: "View Revenue",       description: "Access financial reports and GMV data",         color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  manage_payouts:    { label: "Manage Payouts",     description: "Process provider payout requests",              color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  manage_categories: { label: "Manage Categories",  description: "Add, edit, or reorder service categories",     color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
  manage_support:    { label: "Manage Support",     description: "Handle user support tickets",                   color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
};

const ALL_CAPABILITIES = Object.keys(CAPABILITY_META) as StaffCapability[];

// ─── Capability chip ──────────────────────────────────────────────────────────

function CapChip({ cap }: { cap: string }) {
  const meta = CAPABILITY_META[cap as StaffCapability];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ─── Capability checkboxes ────────────────────────────────────────────────────

function CapabilityCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (caps: string[]) => void;
}) {
  function toggle(cap: StaffCapability) {
    onChange(
      selected.includes(cap)
        ? selected.filter((c) => c !== cap)
        : [...selected, cap]
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {ALL_CAPABILITIES.map((cap) => {
        const meta = CAPABILITY_META[cap];
        const checked = selected.includes(cap);
        return (
          <label
            key={cap}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              checked
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(cap)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} mb-0.5`}>
                {meta.label}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">{meta.description}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────

function AddStaffModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (staff: StaffMember) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (capabilities.length === 0) {
      toast.error("Select at least one capability");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, capabilities }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create staff");
      toast.success("Staff member created");
      onCreated(data.staff as StaffMember);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Staff Member</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Capabilities</label>
              <CapabilityCheckboxes selected={capabilities} onChange={setCapabilities} />
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Staff Modal ─────────────────────────────────────────────────────────

function EditStaffModal({
  staff,
  onClose,
  onUpdated,
}: {
  staff: StaffMember;
  onClose: () => void;
  onUpdated: (updated: StaffMember) => void;
}) {
  const [capabilities, setCapabilities] = useState<string[]>(staff.capabilities);
  const [isSuspended, setIsSuspended] = useState(staff.isSuspended);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (capabilities.length === 0) {
      toast.error("Select at least one capability");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/${staff._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilities, isSuspended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update staff");
      toast.success("Staff member updated");
      onUpdated(data.staff as StaffMember);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Staff Member</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{staff.name} · {staff.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Capabilities</label>
              <CapabilityCheckboxes selected={capabilities} onChange={setCapabilities} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Suspend Account</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Suspended staff cannot log in</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuspended((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isSuspended ? "bg-red-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSuspended ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  function handleCreated(s: StaffMember) {
    setStaff((prev) => [s, ...prev]);
    setShowAddModal(false);
  }

  function handleUpdated(updated: StaffMember) {
    setStaff((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setEditTarget(null);
  }

  async function handleDeactivate(s: StaffMember) {
    if (!confirm(`Deactivate ${s.name}? They will no longer be able to log in.`)) return;
    setDeactivating(s._id);
    try {
      const res = await fetch(`/api/admin/staff/${s._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to deactivate");
      }
      setStaff((prev) =>
        prev.map((m) => (m._id === s._id ? { ...m, isSuspended: true } : m))
      );
      toast.success(`${s.name} has been deactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeactivating(null);
    }
  }

  async function handleReactivate(s: StaffMember) {
    try {
      const res = await fetch(`/api/admin/staff/${s._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reactivate");
      setStaff((prev) =>
        prev.map((m) => (m._id === s._id ? { ...m, isSuspended: false } : m))
      );
      toast.success(`${s.name} has been reactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{staff.length} staff member{staff.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {/* Empty state */}
      {staff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 mb-4">
            <UserCog className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-semibold">No staff members yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            Add staff members to delegate specific admin capabilities.
          </p>
        </div>
      )}

      {/* Staff table */}
      {staff.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Capabilities</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {staff.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{s.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {s.capabilities.length === 0 ? (
                        <span className="text-slate-400 dark:text-slate-500 text-xs italic">None</span>
                      ) : (
                        s.capabilities.map((cap) => <CapChip key={cap} cap={cap} />)
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {s.isSuspended ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <Ban className="h-3 w-3" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditTarget(s)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit capabilities"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {s.isSuspended ? (
                        <button
                          onClick={() => handleReactivate(s)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Reactivate"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(s)}
                          disabled={deactivating === s._id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Deactivate"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddStaffModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
      {editTarget && (
        <EditStaffModal
          staff={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
