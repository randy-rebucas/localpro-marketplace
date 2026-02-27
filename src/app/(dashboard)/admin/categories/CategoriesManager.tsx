"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { ICategory } from "@/types";

const COMMON_ICONS = ["🔧", "⚡", "🧹", "🌿", "🪚", "🎨", "🏠", "❄️", "📦", "🛠️", "📋", "🚿", "🐛", "🔑", "🪟"];

interface Props {
  initialCategories: ICategory[];
}

export default function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<ICategory[]>(initialCategories);
  const [loading, setLoading] = useState<string | null>(null);

  // ── Add form state ────────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🔧");
  const [adding, setAdding] = useState(false);

  // ── Inline edit ──────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function toggleActive(cat: ICategory) {
    setLoading(`toggle-${cat._id}`);
    try {
      const res = await fetch(`/api/admin/categories/${cat._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      setCategories((prev) => prev.map((c) => c._id === cat._id ? { ...c, isActive: !c.isActive } : c));
      toast.success(cat.isActive ? "Category hidden" : "Category activated");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(null); }
  }

  async function deleteCategory(cat: ICategory) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    setLoading(`delete-${cat._id}`);
    try {
      const res = await fetch(`/api/admin/categories/${cat._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      toast.success(`"${cat.name}" deleted`);
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(null); }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) { toast.error("Name is required"); return; }
    setLoading(`save-${id}`);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim(), icon: editIcon }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
      setCategories((prev) => prev.map((c) => c._id === id ? { ...c, name: data.name, slug: data.slug, icon: data.icon } : c));
      setEditId(null);
      toast.success("Category updated");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(null); }
  }

  async function addCategory() {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create"); return; }
      setCategories((prev) => [...prev, data]);
      setNewName("");
      setNewIcon("🔧");
      toast.success(`"${data.name}" added`);
    } catch { toast.error("Something went wrong"); }
    finally { setAdding(false); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Add new ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
          Add New Category
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="e.g. Pool Maintenance"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Icon</label>
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {COMMON_ICONS.map((ic) => (
                <option key={ic} value={ic}>{ic}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="primary" isLoading={adding} onClick={addCategory}>
            Add Category
          </Button>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
        {categories.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10">No categories yet.</p>
        )}
        {categories.map((cat) => (
          <div key={cat._id} className="flex items-center gap-3 px-5 py-3">
            {editId === cat._id ? (
              /* ── inline edit mode ── */
              <>
                <select
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                >
                  {COMMON_ICONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(cat._id);
                    if (e.key === "Escape") setEditId(null);
                  }}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" variant="primary" isLoading={loading === `save-${cat._id}`} onClick={() => saveEdit(cat._id)}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              /* ── view mode ── */
              <>
                <span className="text-xl w-8 text-center">{cat.icon}</span>
                <span className={`flex-1 text-sm font-medium ${cat.isActive ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  {cat.name}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {cat.isActive ? "Active" : "Hidden"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditId(cat._id);
                    setEditName(cat.name);
                    setEditIcon(cat.icon);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={cat.isActive ? "secondary" : "primary"}
                  isLoading={loading === `toggle-${cat._id}`}
                  onClick={() => toggleActive(cat)}
                >
                  {cat.isActive ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  isLoading={loading === `delete-${cat._id}`}
                  onClick={() => deleteCategory(cat)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
