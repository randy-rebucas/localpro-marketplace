"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Megaphone, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import type { AnnouncementTarget, AnnouncementType } from "@/types";

interface Announcement {
  _id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetRoles: AnnouncementTarget[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<AnnouncementType, string> = {
  info:    "Info",
  warning: "Warning",
  success: "Success",
  danger:  "Danger",
};

const TYPE_CHIP: Record<AnnouncementType, string> = {
  info:    "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
  danger:  "bg-red-100 text-red-700",
};

const TARGET_OPTIONS: { value: AnnouncementTarget; label: string }[] = [
  { value: "all",      label: "All users"    },
  { value: "client",   label: "Clients"      },
  { value: "provider", label: "Providers"    },
  { value: "admin",    label: "Admin"        },
  { value: "staff",    label: "Staff"        },
];

const EMPTY_FORM = {
  title:       "",
  message:     "",
  type:        "info" as AnnouncementType,
  targetRoles: ["all"] as AnnouncementTarget[],
  isActive:    true,
  expiresAt:   "",
};

interface Props {
  initialAnnouncements: Announcement[];
}

export default function AnnouncementsClient({ initialAnnouncements }: Props) {
  const [items, setItems]     = useState<Announcement[]>(initialAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title:       a.title,
      message:     a.message,
      type:        a.type,
      targetRoles: a.targetRoles,
      isActive:    a.isActive,
      expiresAt:   a.expiresAt ? a.expiresAt.slice(0, 16) : "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  function toggleTarget(val: AnnouncementTarget) {
    setForm((f) => {
      const has = f.targetRoles.includes(val);
      const next = has
        ? f.targetRoles.filter((t) => t !== val)
        : [...f.targetRoles, val];
      return { ...f, targetRoles: next.length ? next : [val] };
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        message:     form.message.trim(),
        type:        form.type,
        targetRoles: form.targetRoles,
        isActive:    form.isActive,
        expiresAt:   form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      if (editing) {
        const res = await fetch(`/api/admin/announcements/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update");
        setItems((prev) => prev.map((a) => (a._id === editing._id ? data.announcement : a)));
        toast.success("Announcement updated");
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create");
        setItems((prev) => [data.announcement, ...prev]);
        toast.success("Announcement created");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a: Announcement) {
    try {
      const res = await fetch(`/api/admin/announcements/${a._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setItems((prev) => prev.map((x) => (x._id === a._id ? data.announcement : x)));
    } catch {
      toast.error("Could not toggle announcement");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((a) => a._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="text-sm text-slate-500">{items.length} announcement{items.length !== 1 ? "s" : ""}</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Announcement
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Megaphone className="h-10 w-10 opacity-20" />
            <p className="text-sm">No announcements yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Audience</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900 truncate max-w-[200px]">{a.title}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{a.message}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CHIP[a.type]}`}>
                        {TYPE_LABELS[a.type]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {a.targetRoles.map((r) => (
                          <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {a.expiresAt
                        ? new Date(a.expiresAt).toLocaleDateString()
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggle(a)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                          a.isActive ? "text-green-600 hover:text-green-800" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {a.isActive
                          ? <ToggleRight className="h-4 w-4" />
                          : <ToggleLeft className="h-4 w-4" />}
                        {a.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a._id)}
                          disabled={deletingId === a._id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">
                {editing ? "Edit Announcement" : "New Announcement"}
              </h3>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Scheduled maintenance on Saturday"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={3}
                  placeholder="Details visible to users…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Type + Active row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expires (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Target audience */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Audience</label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTarget(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.targetRoles.includes(value)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-slate-700">Active immediately</span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
