"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  CheckCircle2,
  Circle,
  Clock,
  Award,
  ChevronLeft,
  Loader2,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

interface Lesson {
  _id: string;
  title: string;
  content?: string; // Only present when enrolled
  durationMinutes: number;
  order: number;
}

interface Enrollment {
  _id: string;
  status: "enrolled" | "completed";
  completedLessons: string[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  badgeSlug: string;
  durationMinutes: number;
  lessons: Lesson[];
  enrollment: Enrollment | null;
}

export default function TrainingCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [marking, setMarking]     = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/provider/training/${id}`);
        const data = await res.json() as { course: Course };
        setCourse(data.course);
        if (data.course?.lessons?.length > 0) {
          setActiveLesson(data.course.lessons[0]);
        }
      } catch {
        toast.error("Failed to load course.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function markLessonDone(lessonId: string) {
    if (!course?.enrollment) return;
    setMarking(lessonId);
    try {
      const res = await fetch(
        `/api/provider/training/enrollments/${course.enrollment._id}/lessons/${lessonId}/complete`,
        { method: "POST" }
      );
      const data = await res.json() as { enrollment?: Enrollment; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed."); return; }
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              enrollment: data.enrollment
                ? {
                    ...prev.enrollment!,
                    completedLessons: (data.enrollment as Enrollment).completedLessons,
                  }
                : prev.enrollment,
            }
          : prev
      );
      toast.success("Lesson marked complete!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setMarking(null);
    }
  }

  async function handleCompleteCourse() {
    if (!course?.enrollment) return;
    if (!confirm("Mark this course as completed and earn your badge?")) return;
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/provider/training/enrollments/${course.enrollment._id}/complete`,
        { method: "POST" }
      );
      const data = await res.json() as { enrollment?: Enrollment; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed."); return; }
      toast.success("🎓 Course completed! Badge granted.");
      setTimeout(() => router.push("/provider/training"), 1500);
    } catch {
      toast.error("Something went wrong.");
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
      <div className="text-center py-16 text-slate-400">
        <Lock className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Course not found or not yet published.</p>
      </div>
    );
  }

  const enrollment = course.enrollment;
  const completedSet = new Set(enrollment?.completedLessons ?? []);
  const allDone = course.lessons.length > 0 && completedSet.size >= course.lessons.length;

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Training
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            {course.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{course.description}</p>
        </div>
        {enrollment?.status === "completed" && (
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 px-3 py-1.5 rounded-full whitespace-nowrap">
            <Award className="h-4 w-4" /> Badge earned
          </span>
        )}
      </div>

      {!enrollment ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          You must enroll to access lesson content. Go back to the{" "}
          <button onClick={() => router.push("/provider/training")} className="underline font-medium">
            course catalog
          </button>{" "}
          to enroll.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lesson sidebar */}
          <div className="md:col-span-1 space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lessons</p>
            {course.lessons
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((lesson) => {
                const done = completedSet.has(lesson._id);
                return (
                  <button
                    key={lesson._id}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2 transition-colors ${
                      activeLesson?._id === lesson._id
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-snug">{lesson.title}</span>
                    <span className="ml-auto text-xs text-slate-400 shrink-0 flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {lesson.durationMinutes}m
                    </span>
                  </button>
                );
              })}

            {/* Complete course button */}
            {enrollment.status !== "completed" && allDone && (
              <button
                disabled={completing}
                onClick={() => void handleCompleteCourse()}
                className="w-full mt-3 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                Complete Course &amp; Earn Badge
              </button>
            )}
          </div>

          {/* Lesson content */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            {activeLesson ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{activeLesson.title}</h3>
                  {!completedSet.has(activeLesson._id) && enrollment.status !== "completed" && (
                    <button
                      disabled={marking === activeLesson._id}
                      onClick={() => void markLessonDone(activeLesson._id)}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {marking === activeLesson._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Mark Done
                    </button>
                  )}
                  {completedSet.has(activeLesson._id) && (
                    <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Done
                    </span>
                  )}
                </div>
                {activeLesson.content ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: activeLesson.content.replace(/\n/g, "<br />") }}
                  />
                ) : (
                  <p className="text-slate-400 text-sm">Lesson content not available.</p>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Select a lesson from the list.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
