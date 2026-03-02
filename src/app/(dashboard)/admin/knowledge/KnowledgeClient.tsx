"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, BookOpen, Eye, EyeOff, Search } from "lucide-react";
import toast from "react-hot-toast";
import type { KnowledgeAudience } from "@/types";

interface Article {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  group: string;
  audience: KnowledgeAudience;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const AUDIENCE_LABELS: Record<KnowledgeAudience, string> = {
  client:   "Client",
  provider: "Provider",
  both:     "Both",
};

const AUDIENCE_CHIP: Record<KnowledgeAudience, string> = {
  client:   "bg-blue-100 text-blue-700",
  provider: "bg-violet-100 text-violet-700",
  both:     "bg-emerald-100 text-emerald-700",
};

const EMPTY_FORM = {
  title:       "",
  excerpt:     "",
  content:     "",
  group:       "",
  audience:    "both" as KnowledgeAudience,
  order:       0,
  isPublished: true,
};

interface Props {
  initialArticles: Article[];
}

export default function KnowledgeClient({ initialArticles }: Props) {
  const [items, setItems]           = useState<Article[]>(initialArticles);
  const [query, setQuery]           = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Article | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Group by audience then group name for display
  const grouped = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const a of filtered) {
      const key = `${a.audience}__${a.group}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(a: Article) {
    setEditing(a);
    setForm({
      title:       a.title,
      excerpt:     a.excerpt,
      content:     a.content,
      group:       a.group,
      audience:    a.audience,
      order:       a.order,
      isPublished: a.isPublished,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim() || !form.group.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), excerpt: form.excerpt.trim(), group: form.group.trim() };

      if (editing) {
        const res = await fetch(`/api/admin/knowledge/${editing._id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update");
        setItems((prev) => prev.map((a) => (a._id === editing._id ? data.article : a)));
        toast.success("Article updated");
      } else {
        const res = await fetch("/api/admin/knowledge", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create");
        setItems((prev) => [data.article, ...prev]);
        toast.success("Article created");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(a: Article) {
    try {
      const res = await fetch(`/api/admin/knowledge/${a._id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isPublished: !a.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((x) => (x._id === a._id ? data.article : x)));
    } catch {
      toast.error("Could not toggle publish status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this article permanently?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((a) => a._id !== id));
      toast.success("Article deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter articles…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Article
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-slate-500">
        <span>{items.length} article{items.length !== 1 ? "s" : ""} total</span>
        <span>·</span>
        <span>{items.filter((a) => a.isPublished).length} published</span>
      </div>

      {/* Grouped content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <BookOpen className="h-10 w-10 opacity-20" />
          <p className="text-sm">{query ? `No articles matching "${query}"` : "No articles yet"}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([key, groupArticles]) => {
            const [audienceKey, groupName] = key.split("__");
            const audience = audienceKey as KnowledgeAudience;
            return (
              <div key={key}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${AUDIENCE_CHIP[audience]}`}>
                    {AUDIENCE_LABELS[audience]}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{groupName}</span>
                  <span className="text-xs text-slate-400">({groupArticles.length})</span>
                </div>

                {/* Articles table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {groupArticles.map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-900 truncate max-w-xs">{a.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{a.excerpt}</p>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            Order {a.order}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleTogglePublish(a)}
                              className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                a.isPublished
                                  ? "text-green-600 hover:text-green-800"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              {a.isPublished ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                              {a.isPublished ? "Published" : "Draft"}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => openEdit(a)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(a._id)}
                                disabled={deletingId === a._id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-semibold text-slate-900">
                {editing ? "Edit Article" : "New Article"}
              </h3>
            </div>

            {/* Body — scrollable */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. How to post your first job"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Excerpt</label>
                <input
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Short description shown in the article listing"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={10}
                  placeholder="Full article content…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y font-mono"
                />
              </div>

              {/* Group + Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Group</label>
                  <input
                    value={form.group}
                    onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                    placeholder="e.g. Getting Started"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Audience */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Audience</label>
                <div className="flex gap-2">
                  {(["client", "provider", "both"] as KnowledgeAudience[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, audience: val }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.audience === val
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {AUDIENCE_LABELS[val]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Published */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-slate-700">Publish immediately</span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
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
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
