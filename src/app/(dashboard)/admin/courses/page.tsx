"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  GraduationCap, PlusCircle, Pencil, Trash2, Eye, EyeOff, Loader2,
  BookOpen, Users, ChevronDown, ChevronUp, X, Plus, GripVertical,
  Clock, Tag, BadgeCheck, DollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import MdEditor from "@/components/ui/MdEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseCategory = "basic" | "advanced" | "safety" | "custom" | "certification";

interface Lesson {
  _id?: string;
  title: string;
  content: string;
  durationMinutes: number;
  order: number;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: CourseCategory;
  price: number;
  durationMinutes: number;
  badgeSlug: string;
  isPublished: boolean;
  enrollmentCount: number;
  lessons: Lesson[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  basic: "Basic", advanced: "Advanced", safety: "Safety", custom: "Specialty", certification: "Certification",
};

const CATEGORY_COLOR: Record<CourseCategory, string> = {
  basic:         "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  advanced:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  safety:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  custom:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  certification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const EMPTY_LESSON = (): Lesson => ({ title: "", content: "", durationMinutes: 5, order: 0 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Lesson editor row ────────────────────────────────────────────────────────

function LessonRow({
  lesson, index, onChange, onRemove,
}: {
  lesson: Lesson;
  index: number;
  onChange: (i: number, patch: Partial<Lesson>) => void;
  onRemove: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/40">
        <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
        <span className="text-[11px] font-bold text-slate-400 w-5">{index + 1}.</span>
        <input
          value={lesson.title}
          onChange={(e) => onChange(index, { title: e.target.value })}
          placeholder="Lesson title"
          className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <Clock className="h-3 w-3 text-slate-400" />
          <input
            type="number"
            min={1}
            value={lesson.durationMinutes}
            onChange={(e) => onChange(index, { durationMinutes: Math.max(1, Number(e.target.value)) })}
            className="w-12 bg-transparent text-xs text-slate-600 dark:text-slate-400 text-right focus:outline-none"
          />
          <span className="text-[10px] text-slate-400">min</span>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>
        <button type="button" onClick={() => onRemove(index)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
          <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
        </button>
      </div>
      {open && (
        <div className="p-3">
          <MdEditor
            value={lesson.content}
            onChange={(v) => onChange(index, { content: v })}
            placeholder="Lesson content (Markdown supported)…"
            rows={6}
          />
        </div>
      )}
    </div>
  );
}

// ─── Course form modal ────────────────────────────────────────────────────────

interface FormData {
  title: string;
  slug: string;
  description: string;
  category: CourseCategory;
  price: string;
  durationMinutes: string;
  badgeSlug: string;
  isPublished: boolean;
  lessons: Lesson[];
}

function CourseModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Course;
  onClose: () => void;
  onSaved: (course: Course) => void;
}) {
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(isEdit);

  const [form, setForm] = useState<FormData>({
    title:           initial?.title           ?? "",
    slug:            initial?.slug            ?? "",
    description:     initial?.description     ?? "",
    category:        initial?.category        ?? "basic",
    price:           String(initial?.price    ?? 0),
    durationMinutes: String(initial?.durationMinutes ?? 30),
    badgeSlug:       initial?.badgeSlug       ?? "",
    isPublished:     initial?.isPublished     ?? false,
    lessons:         initial?.lessons ?? [],
  });

  const set = (k: keyof FormData, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  function handleTitleChange(v: string) {
    set("title", v);
    if (!slugManual) set("slug", toSlug(v));
    if (!form.badgeSlug || !slugManual) set("badgeSlug", toSlug(v) + "-badge");
  }

  function addLesson() {
    const order = form.lessons.length;
    const next = [...form.lessons, { ...EMPTY_LESSON(), order }];
    set("lessons", next);
    set("durationMinutes", String(next.reduce((s, l) => s + l.durationMinutes, 0)));
  }

  function updateLesson(i: number, patch: Partial<Lesson>) {
    const next = form.lessons.map((l, idx) => idx === i ? { ...l, ...patch } : l);
    set("lessons", next);
    set("durationMinutes", String(next.reduce((s, l) => s + l.durationMinutes, 0)));
  }

  function removeLesson(i: number) {
    const next = form.lessons.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, order: idx }));
    set("lessons", next);
    set("durationMinutes", String(next.reduce((s, l) => s + l.durationMinutes, 0)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim())       { toast.error("Title is required"); return; }
    if (!form.slug.trim())        { toast.error("Slug is required"); return; }
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (!form.badgeSlug.trim())   { toast.error("Badge slug is required"); return; }

    const payload = {
      title:           form.title.trim(),
      slug:            form.slug.trim(),
      description:     form.description.trim(),
      category:        form.category,
      price:           Math.max(0, Number(form.price) || 0),
      durationMinutes: Math.max(1, Number(form.durationMinutes) || 1),
      badgeSlug:       form.badgeSlug.trim(),
      isPublished:     form.isPublished,
      lessons:         form.lessons.map((l, i) => ({
        title:           l.title.trim(),
        content:         l.content,
        durationMinutes: l.durationMinutes,
        order:           i,
      })),
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await apiFetch(`/api/admin/courses/${initial!._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await apiFetch("/api/admin/courses",                  { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Save failed"); return; }
      toast.success(isEdit ? "Course updated!" : "Course created!");
      onSaved(isEdit ? data.course : data.course);
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  }

  // Close on Escape
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        ref={ref}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit Course" : "New Course"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <form id="course-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Title <span className="text-red-400">*</span></label>
              <input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Electrical Safety Basics"
                className="w-full input text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Slug <span className="text-red-400">*</span>
                <span className="ml-1 text-[10px] text-slate-400 font-normal">(a-z, 0-9, hyphens)</span>
              </label>
              <input
                value={form.slug}
                onChange={(e) => { setSlugManual(true); set("slug", e.target.value); }}
                placeholder="e.g. electrical-safety-basics"
                className="w-full input text-sm rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Description <span className="text-red-400">*</span></label>
            <MdEditor
              value={form.description}
              onChange={(v) => set("description", v)}
              rows={4}
              placeholder="What will providers learn? **Markdown** supported."
            />
          </div>

          {/* Category + Price + Duration + Badge */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full input text-sm rounded-xl">
                {(Object.keys(CATEGORY_LABELS) as CourseCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Price (₱) — 0 = Free</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-full input text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Total Duration (min)</label>
              <input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
                className="w-full input text-sm rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Badge Slug <span className="text-red-400">*</span>
              </label>
              <input
                value={form.badgeSlug}
                onChange={(e) => { setSlugManual(true); set("badgeSlug", e.target.value); }}
                placeholder="e.g. electrical-safety-basics-badge"
                className="w-full input text-sm rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Publish toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set("isPublished", !form.isPublished)}
              className={`relative w-9 h-5 rounded-full transition-colors ${form.isPublished ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {form.isPublished ? "Published — visible to providers" : "Draft — hidden from providers"}
            </span>
          </label>

          {/* Lessons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Lessons ({form.lessons.length})
              </h3>
              <button
                type="button"
                onClick={addLesson}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add lesson
              </button>
            </div>
            {form.lessons.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                No lessons yet — click "Add lesson" to start building the curriculum.
              </p>
            ) : (
              <div className="space-y-2">
                {form.lessons.map((l, i) => (
                  <LessonRow key={i} lesson={l} index={i} onChange={updateLesson} onRemove={removeLesson} />
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            form="course-form"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [courses, setCourses]     = useState<Course[]>([]);
  const [loading, setLoading]     = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal]         = useState<{ open: boolean; course?: Course }>({ open: false });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/courses");
      const data = await res.json() as { courses: Course[]; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to load courses."); return; }
      setCourses(data.courses ?? []);
    } catch {
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  async function togglePublish(course: Course) {
    setTogglingId(course._id);
    try {
      const res = await apiFetch(`/api/admin/courses/${course._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Update failed."); return; }
      toast.success(course.isPublished ? "Course unpublished." : "Course published!");
      setCourses((prev) => prev.map((c) => c._id === course._id ? { ...c, isPublished: !c.isPublished } : c));
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm("Permanently delete this course? This cannot be undone.")) return;
    setDeletingId(courseId);
    try {
      const res = await apiFetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Delete failed."); return; }
      toast.success("Course deleted.");
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      if (expandedId === courseId) setExpandedId(null);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  function onSaved(course: Course) {
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c._id === course._id);
      if (idx >= 0) { const next = [...prev]; next[idx] = course; return next; }
      return [course, ...prev];
    });
    setModal({ open: false });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Training Courses</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {courses.length} course{courses.length !== 1 ? "s" : ""} · {courses.filter((c) => c.isPublished).length} published
              </p>
            </div>
          </div>
          <button
            onClick={() => setModal({ open: true })}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> New Course
          </button>
        </div>

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 ring-8 ring-slate-100 dark:ring-slate-700 inline-flex mb-4">
              <BookOpen className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">No courses yet.</p>
            <button
              onClick={() => setModal({ open: true })}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Create your first course
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex flex-col gap-2 p-2">
              {courses.map((course) => {
                const isExpanded = expandedId === course._id;
                return (
                  <div
                    key={course._id}
                    className={`rounded-xl border transition-colors ${
                      isExpanded
                        ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
                    }`}
                  >
                    {/* Row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : course._id)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-slate-400" />
                          : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </button>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{course.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[course.category]}`}>
                            {CATEGORY_LABELS[course.category]}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            course.isPublished
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          }`}>
                            {course.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{course.durationMinutes} min
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />{course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Users className="h-3 w-3" />{course.enrollmentCount} enrolled
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Tag className="h-3 w-3" /><code className="font-mono">{course.slug}</code>
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          title="Edit"
                          onClick={() => setModal({ open: true, course })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title={course.isPublished ? "Unpublish" : "Publish"}
                          disabled={togglingId === course._id}
                          onClick={() => void togglePublish(course)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-40"
                        >
                          {togglingId === course._id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          title={course.enrollmentCount > 0 ? `Cannot delete — ${course.enrollmentCount} enrollment(s)` : "Delete"}
                          disabled={deletingId === course._id || course.enrollmentCount > 0}
                          onClick={() => void deleteCourse(course._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {deletingId === course._id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 space-y-4">
                        {/* Description */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Description</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{course.description}</p>
                        </div>

                        {/* Badge slug */}
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Badge:</span>
                          <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{course.badgeSlug}</code>
                        </div>

                        {/* Lessons list */}
                        {course.lessons.length > 0 ? (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                              Curriculum ({course.lessons.length} lessons)
                            </p>
                            <div className="space-y-1.5">
                              {course.lessons
                                .slice()
                                .sort((a, b) => a.order - b.order)
                                .map((l, i) => (
                                  <div key={String(l._id ?? i)} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
                                    <span className="text-[10px] font-bold text-slate-400 w-5">{i + 1}.</span>
                                    <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300">{l.title}</span>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" />{l.durationMinutes} min
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No lessons added yet.</p>
                        )}

                        <button
                          onClick={() => setModal({ open: true, course })}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit course & lessons
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <CourseModal
          initial={modal.course}
          onClose={() => setModal({ open: false })}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
