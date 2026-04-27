"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetchClient";
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  PlayCircle,
  Loader2,
  Wallet,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { isPayMongoCheckoutUrl } from "@/lib/utils";

type CourseCategory = "basic" | "advanced" | "safety" | "custom" | "certification";

interface Lesson {
  _id: string;
  title: string;
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
  enrollmentCount: number;
  lessons: Lesson[];
  enrolled: boolean;
  enrollmentStatus: "enrolled" | "completed" | null;
  completedLessonsCount: number;
}

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  basic:         "Basic",
  advanced:      "Advanced",
  safety:        "Safety",
  custom:        "Specialty",
  certification: "Certification",
};

const CATEGORY_COLORS: Record<CourseCategory, string> = {
  basic:         "bg-blue-100 text-blue-700",
  advanced:      "bg-purple-100 text-purple-700",
  safety:        "bg-red-100 text-red-700",
  custom:        "bg-amber-100 text-amber-700",
  certification: "bg-yellow-100 text-yellow-800",
};

export default function ProviderTrainingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [filter, setFilter] = useState<CourseCategory | "all">("all");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/provider/training");
      const data = await res.json() as { courses: Course[] };
      setCourses(data.courses ?? []);
    } catch {
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  async function handleEnroll(courseId: string, price: number) {
    if (price > 0 && !confirm(`Enroll for ₱${price.toLocaleString()} from your wallet?`)) return;
    setEnrolling(courseId);
    try {
      const res = await apiFetch(`/api/provider/training/${courseId}/enroll`, { method: "POST" });
      const data = await res.json() as { activated?: boolean; error?: string };
      if (!res.ok) {
        // Insufficient wallet balance → fall through to PayMongo
        if (data.error?.startsWith("Insufficient wallet balance")) {
          toast("Not enough wallet balance. Redirecting to online payment…", { icon: "💳" });
          setEnrolling(null);
          await handlePayMongo(courseId);
          return;
        }
        toast.error(data.error ?? "Enrollment failed.");
        return;
      }
      toast.success("Enrolled successfully!");
      void fetchCourses();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setEnrolling(null);
    }
  }

  async function handlePayMongo(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await apiFetch(`/api/provider/training/${courseId}/checkout`, { method: "POST" });
      const data = await res.json() as { checkoutUrl?: string; checkoutSessionId?: string; activated?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Could not initiate checkout."); return; }
      if (data.checkoutUrl) {
        if (!isPayMongoCheckoutUrl(data.checkoutUrl)) {
          toast.error("Invalid checkout URL.");
          return;
        }
        // Save session ID so the player page can activate enrollment immediately on return
        if (data.checkoutSessionId) {
          sessionStorage.setItem(`training_session_${courseId}`, data.checkoutSessionId);
        }
        // Keep the spinner going — page is about to redirect
        // (don't call setEnrolling(null) — let the redirect happen)
        window.location.href = data.checkoutUrl;
        return; // skip the finally block clearing the spinner
      } else if (data.activated) {
        toast.success("Enrolled successfully!");
        void fetchCourses();
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setEnrolling(null);
    }
  }

  const myCertifications = courses.filter((c) => c.enrollmentStatus === "completed");
  const myCourses = courses.filter(
    (c) => c.enrolled && c.enrollmentStatus !== "completed"
  );
  const filtered = (filter === "all" ? courses : courses.filter((c) => c.category === filter))
    .filter((c) => !c.enrolled);
  const completedCount = courses.filter((c) => c.enrollmentStatus === "completed").length;
  const enrolledCount  = courses.filter((c) => c.enrolled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Training &amp; Upskilling</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Earn recognised badges by completing professional training courses.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {enrolledCount > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span><strong>{enrolledCount}</strong> enrolled</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Award className="h-4 w-4 text-emerald-400" />
            <span><strong>{completedCount}</strong> completed</span>
          </div>
        </div>
      )}

      {/* My Certifications — completed certification badges */}
      {myCertifications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500" /> My Certificates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCertifications.map((cert) => (
              <div
                key={cert._id}
                className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 ${
                  cert.category === "certification"
                    ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50"
                    : "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50"
                }`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  cert.category === "certification" ? "bg-yellow-100" : "bg-emerald-100"
                }`}>
                  {cert.category === "certification"
                    ? <ShieldCheck className="h-5 w-5 text-yellow-600" />
                    : <Award className="h-5 w-5 text-emerald-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold leading-snug truncate ${
                    cert.category === "certification" ? "text-yellow-900" : "text-emerald-900"
                  }`}>{cert.title}</p>
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                    cert.category === "certification" ? "text-yellow-700" : "text-emerald-700"
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {cert.category === "certification" ? "LocalPro Certified" : "Certificate Earned"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Link
                    href={`/provider/training/${cert._id}/certificate`}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      cert.category === "certification"
                        ? "bg-yellow-200 text-yellow-900 hover:bg-yellow-300"
                        : "bg-emerald-200 text-emerald-900 hover:bg-emerald-300"
                    }`}
                  >
                    <Award className="h-3 w-3" /> Get Certificate
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <hr className="border-slate-200" />
        </div>
      )}

      {/* My Courses — all enrolled */}
      {myCourses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-indigo-500" /> My Courses
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCourses.map((course) => {
              const isCompleted = course.enrollmentStatus === "completed";
              return (
                <Link
                  key={course._id}
                  href={`/provider/training/${course._id}`}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors group ${
                    isCompleted
                      ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                  }`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-emerald-100 group-hover:bg-emerald-200"
                      : "bg-indigo-100 group-hover:bg-indigo-200"
                  }`}>
                    {isCompleted
                      ? <Award className="h-4 w-4 text-emerald-600" />
                      : <GraduationCap className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold leading-snug truncate ${isCompleted ? "text-emerald-800" : "text-indigo-800"}`}>
                      {course.title}
                    </p>
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${isCompleted ? "text-emerald-600" : "text-indigo-500"}`}>
                      {isCompleted ? (
                        <><CheckCircle2 className="h-3 w-3" /> Completed</>
                      ) : (
                        <><BookOpen className="h-3 w-3" /> {course.completedLessonsCount}/{course.lessons.length} lessons</>
                      )}
                    </p>
                    {!isCompleted && course.lessons.length > 0 && (
                      <div className="mt-1.5 h-1 bg-indigo-100 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.round((course.completedLessonsCount / course.lessons.length) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isCompleted ? "text-emerald-400" : "text-indigo-400"}`} />
                </Link>
              );
            })}
          </div>
          <hr className="border-slate-200" />
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "basic", "advanced", "safety", "custom", "certification"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{myCourses.length > 0 || myCertifications.length > 0 ? "You're enrolled in all available courses!" : "No courses available yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div
              key={course._id}
              className={`rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${
                course.category === "certification"
                  ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300"
                  : "bg-white border border-slate-200"
              }`}
            >
              {/* Category badge */}
              <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[course.category]}`}>
                {CATEGORY_LABELS[course.category]}
              </span>

              <h3 className="font-semibold text-slate-800 leading-snug">{course.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {course.durationMinutes} min
                </span>
              </div>

              <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">
                  {course.price === 0 ? "Free" : `₱${course.price.toLocaleString()}`}
                </span>

                {course.enrollmentStatus === "completed" ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Completed
                  </span>
                ) : course.enrolled ? (
                  <Link
                    href={`/provider/training/${course._id}`}
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <PlayCircle className="h-3.5 w-3.5" /> Start Course
                  </Link>
                ) : course.price === 0 ? (
                  <button
                    disabled={enrolling === course._id}
                    onClick={() => void handleEnroll(course._id, 0)}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {enrolling === course._id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Enroll Free
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      disabled={enrolling === course._id}
                      onClick={() => void handleEnroll(course._id, course.price)}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {enrolling === course._id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Wallet className="h-3.5 w-3.5" />}
                      Wallet
                    </button>
                    <button
                      disabled={enrolling === course._id}
                      onClick={() => void handlePayMongo(course._id)}
                      className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
