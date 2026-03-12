"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, BookOpen, Search, FileText, Eye, EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import type { KnowledgeFolder } from "@/lib/knowledge";

interface ArticleRow {
  id: string;          // "client__getting-started"
  slug: string;
  folder: KnowledgeFolder;
  title: string;
  excerpt: string;
  content: string;
  group: string;
  order: number;
  audience: string;
  updatedAt: string;
}

const FOLDER_CHIP: Record<KnowledgeFolder, string> = {
  client:   "bg-blue-100 text-blue-700",
  provider: "bg-violet-100 text-violet-700",
};

const EMPTY_FORM = {
  folder:  "client" as KnowledgeFolder,
  slug:    "",
  title:   "",
  excerpt: "",
  content: "",
  group:   "",
  order:   0,
};

// Auto-generate slug from a title string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

interface Props {
  initialArticles: ArticleRow[];
}

export default function KnowledgeAdminView({ initialArticles }: Props) {
  const router = useRouter();
  const [items, setItems]           = useState<ArticleRow[]>(initialArticles);
  const [query, setQuery]           = useState("");
  const [filterFolder, setFilterFolder] = useState<KnowledgeFolder | "all">("all");
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<ArticleRow | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview]       = useState(false);

  // Collect distinct existing groups for datalist
  const existingGroups = useMemo(
    () => [...new Set(items.map((a) => a.group))].sort(),
    [items]
  );

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (!editing && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugTouched, editing]);

  // ── Filter + group ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((a) => {
      const matchFolder = filterFolder === "all" || a.folder === filterFolder;
      const matchQuery  = !q || a.title.toLowerCase().includes(q) || a.group.toLowerCase().includes(q);
      return matchFolder && matchQuery;
    });
  }, [items, query, filterFolder]);

  const grouped = useMemo(() => {
    const map = new Map<string, ArticleRow[]>();
    for (const a of filtered) {
      const key = `${a.folder}__${a.group}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setSlugTouched(false);
    setForm(EMPTY_FORM);
    setPreview(false);
    setShowModal(true);
  }

  function openEdit(a: ArticleRow) {
    setEditing(a);
    setSlugTouched(true); // slug is locked when editing
    setForm({
      folder:  a.folder,
      slug:    a.slug,
      title:   a.title,
      excerpt: a.excerpt,
      content: a.content,
      group:   a.group,
      order:   a.order,
    });
    setPreview(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const { folder, slug, title, excerpt, content, group, order } = form;
    if (!title.trim() || !excerpt.trim() || !content.trim() || !group.trim() || !slug.trim()) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // PUT — update existing file
        const payload: Record<string, unknown> = { title, excerpt, content, group, order };
        if (folder !== editing.folder) payload.folder = folder;

        const res = await fetch(`/api/admin/knowledge/${editing.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update");

        // Replace in local state (id may change if folder changed)
        setItems((prev) =>
          prev.map((a) => (a.id === editing.id ? data.article : a))
        );
        toast.success("Article saved");
      } else {
        // POST — create new file
        const res = await fetch("/api/admin/knowledge", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ folder, slug, title, excerpt, content, group, order }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create");

        setItems((prev) => [data.article, ...prev]);
        toast.success("Article created");
      }
      closeModal();
      router.refresh(); // sync server state
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: ArticleRow) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setDeletingId(a.id);
    try {
      const res = await fetch(`/api/admin/knowledge/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      toast.success("Article deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter articles…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "client", "provider"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterFolder(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                  filterFolder === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden lg:block">
            {items.length} articles · {items.filter(a => a.folder === "client").length} client · {items.filter(a => a.folder === "provider").length} provider
          </span>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Article
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700">
            <BookOpen className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{query ? `No articles matching “${query}”` : "No articles yet"}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([key, groupArticles]) => {
            const [folderKey, groupName] = key.split("__");
            const fld = folderKey as KnowledgeFolder;
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${FOLDER_CHIP[fld]}`}>
                    {fld}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{groupName}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">({groupArticles.length})</span>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {groupArticles.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-xs">{a.title}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-xs">{a.excerpt}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap hidden md:table-cell">
                            Order {a.order}
                          </td>
                          <td className="px-4 py-3.5 hidden lg:table-cell">
                            <code className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-mono">
                              {a.folder}/{a.slug}.md
                            </code>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap hidden md:table-cell">
                            {new Date(a.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => openEdit(a)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(a)}
                                disabled={deletingId === a.id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
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

          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-slate-900">
                {editing ? `Edit — ${editing.title}` : "New Article"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview((p) => !p)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    preview
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {preview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Preview
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Form fields */}
              <div className={`flex flex-col gap-4 px-6 py-5 overflow-y-auto ${preview ? "w-1/2 border-r border-slate-100" : "w-full"}`}>
                {/* Folder + Audience row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Audience</label>
                    <div className="flex gap-2">
                      {(["client", "provider"] as KnowledgeFolder[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          disabled={!!editing && f === editing.folder && !editing}
                          onClick={() => setForm((x) => ({ ...x, folder: f }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                            form.folder === f
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Slug
                      {editing && <span className="ml-1.5 text-[10px] text-slate-400">(locked after creation)</span>}
                    </label>
                    <input
                      value={form.slug}
                      disabled={!!editing}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm((x) => ({ ...x, slug: slugify(e.target.value) }));
                      }}
                      placeholder="auto-generated"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))}
                    placeholder="e.g. How to Post a Job"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Excerpt</label>
                  <input
                    value={form.excerpt}
                    onChange={(e) => setForm((x) => ({ ...x, excerpt: e.target.value }))}
                    placeholder="Short description shown in the article listing"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {/* Group + Order */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Group</label>
                    <input
                      value={form.group}
                      onChange={(e) => setForm((x) => ({ ...x, group: e.target.value }))}
                      list="group-suggestions"
                      placeholder="e.g. Getting Started"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <datalist id="group-suggestions">
                      {existingGroups.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm((x) => ({ ...x, order: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Content
                    <span className="ml-1.5 text-[10px] text-slate-400 font-normal">Markdown supported</span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((x) => ({ ...x, content: e.target.value }))}
                    rows={14}
                    placeholder={`## Heading\n\nWrite your article content here in Markdown...\n\n- Bullet points\n- **Bold**, _italic_\n- [Links](https://example.com)`}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Preview pane */}
              {preview && (
                <div className="w-1/2 overflow-y-auto px-6 py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                    {form.group || "Group"}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    {form.title || "Article title"}
                  </h2>
                  <p className="text-sm text-slate-500 mb-4">{form.excerpt}</p>
                  <div
                    className="prose prose-slate prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: form.content
                        ? (typeof window !== "undefined"
                            ? ""
                            : "")
                        : "<p class='text-slate-400 italic'>Start typing to preview…</p>",
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-4 italic">
                    (Full HTML preview available after saving)
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
              <p className="text-xs text-slate-400">
                Saves to{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                  content/knowledge/{form.folder}/{form.slug || "slug"}.md
                </code>
              </p>
              <div className="flex gap-3">
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
        </div>
      )}
    </>
  );
}
