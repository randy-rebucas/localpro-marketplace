"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GraduationCap,
  PlusCircle,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

type CourseCategory = "basic" | "advanced" | "safety" | "custom";

interface Course {
  _id: string;
  title: string;
  slug: string;
  category: CourseCategory;
  price: number;
  durationMinutes: number;
  isPublished: boolean;
  enrollmentCount: number;
  lessons: unknown[];
}

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  basic: "Basic", advanced: "Advanced", safety: "Safety", custom: "Specialty",
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
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
      const res = await fetch(`/api/admin/courses/${course._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Update failed."); return; }
      toast.success(course.isPublished ? "Course unpublished." : "Course published!");
      void fetchCourses();
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
      const res = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Delete failed."); return; }
      toast.success("Course deleted.");
      void fetchCourses();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-500" />
            Training Courses
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage provider upskilling courses. Use the API to create/edit content.
          </p>
        </div>
        <a
          href="/api/admin/courses"
          target="_blank"
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" /> API Docs
        </a>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No courses yet. Create one via the API.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Lessons</th>
                <th className="px-4 py-3 text-right">Enrolled</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course._id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{course.title}</td>
                  <td className="px-4 py-3 text-slate-500">{CATEGORY_LABELS[course.category]}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    <span className="flex items-center justify-end gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> {course.lessons.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    <span className="flex items-center justify-end gap-1">
                      <Users className="h-3.5 w-3.5" /> {course.enrollmentCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        course.isPublished
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title={course.isPublished ? "Unpublish" : "Publish"}
                        disabled={togglingId === course._id}
                        onClick={() => void togglePublish(course)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                      >
                        {togglingId === course._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : course.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        title="Delete"
                        disabled={deletingId === course._id || course.enrollmentCount > 0}
                        onClick={() => void deleteCourse(course._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {deletingId === course._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
  );
}
