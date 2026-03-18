"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  ChevronRight,
  GraduationCap,
  Loader2,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

interface Lesson {
  _id: string;
  title: string;
  content?: string;
  durationMinutes: number;
  order: number;
  videoUrl?: string;
  imageUrl?: string;
}

interface Enrollment {
  _id: string;
  status: "enrolled" | "completed";
  completedLessons: string[];
  completedAt?: string;
  badgeGranted?: boolean;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  badgeSlug: string;
  lessons: Lesson[];
  enrollment: Enrollment | null;
}

function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const t = useTranslations("training");
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{t("progress", { done, total })}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TrainingCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const t = useTranslations("training");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [marking, setMarking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [awaitingActivation, setAwaitingActivation] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/provider/training/${id}`);
      if (!res.ok) { toast.error(t("courseNotFound")); return; }
      const data = await res.json() as { course: Course };
      const c = data.course;
      setCourse(c);
      // Auto-select first incomplete lesson, or first lesson
      const sorted = [...(c.lessons ?? [])].sort((a, b) => a.order - b.order);
      const doneSet = new Set(c.enrollment?.completedLessons ?? []);
      const firstIncomplete = sorted.find((l) => !doneSet.has(l._id));
      setActiveLesson(firstIncomplete ?? sorted[0] ?? null);
      return c;
    } catch {
      toast.error(t("loadFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchCourse(); }, [fetchCourse]);

  // Handle ?payment=success / ?payment=cancelled from PayMongo redirect
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (!payment) return;

    // Clean the URL without navigating away
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    if (payment === "cancelled") {
      toast.error(t("paymentCancelled"));
      return;
    }

    if (payment === "success") {
      toast.success(t("paymentReceived"));
      setAwaitingActivation(true);

      const storedSessionId = sessionStorage.getItem(`training_session_${id}`);

      void (async () => {
        // Try to activate immediately using the stored session ID
        if (storedSessionId) {
          sessionStorage.removeItem(`training_session_${id}`);
          try {
            const activateRes = await fetch(`/api/provider/training/${id}/activate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: storedSessionId }),
            });
            const activateData = await activateRes.json() as { activated?: boolean; error?: string };
            if (activateRes.ok && activateData.activated) {
              const courseData = await fetchCourse();
              setAwaitingActivation(false);
              if (courseData?.enrollment) {
                toast.success(t("enrollmentActivated"));
              }
              return;
            }
          } catch {
            // Fall through to polling below
          }
        }

        // Fallback: poll every 3s up to 8 times (24s) waiting for webhook to activate enrollment
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts += 1;
          try {
            const res = await fetch(`/api/provider/training/${id}`);
            const data = await res.json() as { course: Course };
            if (data.course?.enrollment) {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              setAwaitingActivation(false);
              setCourse(data.course);
              const sorted = [...(data.course.lessons ?? [])].sort((a, b) => a.order - b.order);
              setActiveLesson(sorted[0] ?? null);
              toast.success(t("enrollmentActivated"));
              return;
            }
          } catch { /* ignore polling errors */ }
          if (attempts >= 8) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setAwaitingActivation(false);
            toast(t("completionProcessing"), { icon: "⏳" });
          }
        }, 3000);
      })();
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Run once on mount only

  async function handleMarkComplete() {
    if (!course?.enrollment || !activeLesson) return;
    setMarking(true);
    try {
      const res = await fetch(
        `/api/provider/training/enrollments/${course.enrollment._id}/lessons/${activeLesson._id}/complete`,
        { method: "POST" }
      );
      const data = await res.json() as { enrollment?: { completedLessons: string[] }; error?: string };
      if (!res.ok) { toast.error(data.error ?? t("markCompleteFailed")); return; }
      const freshIds = data.enrollment?.completedLessons ?? [];
      setCourse((prev) =>
        prev
          ? { ...prev, enrollment: prev.enrollment ? { ...prev.enrollment, completedLessons: freshIds } : prev.enrollment }
          : prev
      );
      toast.success(t("lessonCompleted"));
      // Advance to next incomplete lesson
      const updatedDone = new Set(freshIds);
      const sorted = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
      const next = sorted.find((l) => l.order > activeLesson.order && !updatedDone.has(l._id));
      if (next) setActiveLesson(next);
    } catch {
      toast.error(t("enrollmentFailed"));
    } finally {
      setMarking(false);
    }
  }

  async function handleCompleteCourse() {
    if (!course?.enrollment) return;
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/provider/training/enrollments/${course.enrollment._id}/complete`,
        { method: "POST" }
      );
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? t("completeCourseError")); return; }
      toast.success(t("courseCompleted"));
      void fetchCourse();
    } catch {
      toast.error(t("enrollmentFailed"));
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-slate-400">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>{t("courseNotFound")}</p>
        <Link href="/provider/training" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
          ← {t("backToCourses")}
        </Link>
      </div>
    );
  }

  const enrollment = course.enrollment;
  const completedSet = new Set(enrollment?.completedLessons ?? []);
  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);
  const doneCount = sortedLessons.filter((l) => completedSet.has(l._id)).length;
  const allDone = sortedLessons.length > 0 && doneCount === sortedLessons.length;
  const isEnrolled = !!enrollment;
  const courseComplete = enrollment?.status === "completed";
  const activeLessonDone = activeLesson ? completedSet.has(activeLesson._id) : false;

  return (
    <div className="space-y-4">
      {/* Back + Title */}
      <div>
        <Link
          href="/provider/training"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToCourses")}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-indigo-50 rounded-xl flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{course.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {t("lessons", { count: sortedLessons.length })}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t("minutes", { count: course.durationMinutes })}</span>
              </div>
            </div>
          </div>
          {courseComplete && (
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0">
              <Award className="h-4 w-4" /> {t("badgeEarnedBanner")}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isEnrolled && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <ProgressBar done={doneCount} total={sortedLessons.length} />
        </div>
      )}

      {/* Activation pending banner */}
      {awaitingActivation && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-indigo-500 flex-shrink-0 animate-spin" />
          <p className="text-sm text-indigo-800 font-medium">
            {t("activating")}
          </p>
        </div>
      )}

      {/* Not enrolled notice */}
      {!isEnrolled && !awaitingActivation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            {t("notEnrolled")}{" "}
            <Link href="/provider/training" className="underline font-medium hover:text-amber-900">{t("enrollFirst")}</Link>
            {" "}{t("toUnlockContent")}
          </p>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">

        {/* Lesson sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("lessonsNav")}</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {sortedLessons.map((lesson, idx) => {
              const done = completedSet.has(lesson._id);
              const isActive = activeLesson?._id === lesson._id;
              return (
                <li key={lesson._id}>
                  <button
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isActive ? "text-indigo-400" : "text-slate-300"}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${isActive ? "font-semibold text-indigo-700" : done ? "text-slate-400" : "text-slate-700"}`}>
                        {idx + 1}. {lesson.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {lesson.durationMinutes} min
                      </p>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Complete course CTA */}
          {isEnrolled && allDone && !courseComplete && (
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => void handleCompleteCourse()}
                disabled={completing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                {t("claimBadge")}
              </button>
            </div>
          )}

          {courseComplete && (
            <div className="px-4 py-3 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <Award className="h-4 w-4" /> {t("badgeEarned")}
              </div>
              <Link
                href={`/provider/training/${id}/certificate`}
                className="flex items-center justify-center gap-1.5 bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Award className="h-3.5 w-3.5" /> {t("downloadCertBtn")}
              </Link>
            </div>
          )}
        </div>

        {/* Lesson content */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {activeLesson ? (
            <>
              {/* Lesson header */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-800">{activeLesson.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {activeLesson.durationMinutes} min
                  </p>
                </div>
                {activeLessonDone && (
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4" /> {t("completed")}
                  </span>
                )}
              </div>

              {/* Lesson body — video, image, rendered markdown */}
              <div className="px-6 py-5 space-y-5">
                {/* Video embed */}
                {activeLesson.content && activeLesson.videoUrl && (() => {
                  const ytMatch = activeLesson.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                  const vimeoMatch = activeLesson.videoUrl.match(/vimeo\.com\/(\d+)/);
                  const embedSrc = ytMatch
                    ? `https://www.youtube.com/embed/${ytMatch[1]}`
                    : vimeoMatch
                    ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
                    : null;
                  return embedSrc ? (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
                      <iframe
                        src={embedSrc}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                        title={activeLesson.title}
                      />
                    </div>
                  ) : (
                    <video
                      src={activeLesson.videoUrl}
                      controls
                      className="w-full rounded-xl border border-slate-200 bg-black"
                    />
                  );
                })()}

                {/* Guide image */}
                {activeLesson.content && activeLesson.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeLesson.imageUrl}
                    alt={`${activeLesson.title} guide`}
                    className="w-full rounded-xl border border-slate-200 object-cover max-h-96"
                  />
                )}

                {/* Markdown content */}
                {activeLesson.content ? (
                  <div
                    className="prose prose-sm prose-slate max-w-none
                      prose-headings:font-bold prose-headings:text-slate-800
                      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                      prose-p:text-slate-600 prose-li:text-slate-600
                      prose-strong:text-slate-800
                      prose-table:text-sm prose-td:py-1.5 prose-th:py-1.5
                      prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-xs
                      prose-blockquote:border-indigo-300 prose-blockquote:text-slate-500"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                    <Lock className="h-6 w-6" />
                    <p className="text-sm">{t("lockMessage")}</p>
                  </div>
                )}
              </div>

              {/* Footer: Mark complete or Next lesson */}
              {isEnrolled && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span />
                  {!activeLessonDone && !courseComplete && activeLesson.content ? (
                    <button
                      onClick={() => void handleMarkComplete()}
                      disabled={marking}
                      className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {t("markComplete")}
                    </button>
                  ) : activeLessonDone && (() => {
                    const next = sortedLessons.find((l) => l.order > activeLesson.order);
                    return next ? (
                      <button
                        onClick={() => setActiveLesson(next)}
                        className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold hover:underline"
                      >
                        {t("nextLesson", { title: next.title })} <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : null;
                  })()}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <BookOpen className="h-8 w-8 opacity-40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
