"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { IJob, IReview } from "@/types";
import PageGuide from "@/components/shared/PageGuide";
import { Briefcase, User, Calendar, Star } from "lucide-react";

const Modal = dynamic(() => import("@/components/ui/Modal"), { ssr: false });

type PopulatedJob = IJob & {
  providerId?: { _id: string; name: string } | null;
  updatedAt: Date | string;
};

export default function ClientReviewsPage() {
  const [reviewableJobs, setReviewableJobs] = useState<PopulatedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; job: PopulatedJob | null }>({
    open: false, job: null,
  });
  const [rating, setRating] = useState(5);
  const [breakdown, setBreakdown] = useState({ quality: 5, professionalism: 5, punctuality: 5, communication: 5 });
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredBreakdown, setHoveredBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchJobs() {
      try {
        // Fetch completed jobs and existing reviews in parallel
        const [jobsRes, reviewsRes] = await Promise.all([
          apiFetch("/api/jobs?status=completed"),
          apiFetch("/api/reviews"),
        ]);
        if (!jobsRes.ok) return;
        const [jobsData, reviewsData] = await Promise.all([
          jobsRes.json(),
          reviewsRes.ok ? reviewsRes.json() : Promise.resolve([]),
        ]);

        // Build set of already-reviewed jobIds
        const reviewedJobIds = new Set<string>(
          (reviewsData as IReview[]).map((r) => {
            const j = r.jobId;
            if (j && typeof j === "object" && "_id" in j) {
              return (j as { _id: string })._id?.toString();
            }
            return j?.toString();
          })
        );

        // Keep only escrow-released jobs that haven't been reviewed yet
        const eligible = (jobsData.data as PopulatedJob[]).filter(
          (j) => j.escrowStatus === "released" && !reviewedJobIds.has(j._id?.toString())
        );
        setReviewableJobs(eligible);
      } catch {
        toast.error("Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    }
    fetchJobs();
  }, []);

  async function submitReview() {
    if (!reviewModal.job) return;
    const trimmed = feedback.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error("Please write at least 10 characters of feedback");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: reviewModal.job._id, rating, feedback: trimmed, breakdown }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to submit review"); return; }
      toast.success("Review submitted!");
      resetModal();
      setReviewableJobs((prev) => prev.filter((j) => j._id?.toString() !== reviewModal.job!._id?.toString()));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetModal() {
    setReviewModal({ open: false, job: null });
    setFeedback("");
    setRating(5);
    setHoveredRating(0);
    setHoveredBreakdown({});
    setBreakdown({ quality: 5, professionalism: 5, punctuality: 5, communication: 5 });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
            <p className="text-slate-500 text-sm mt-1">Rate providers for your completed jobs.</p>
          </div>
        </div>
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-1/2 rounded bg-slate-100" />
                  <div className="flex gap-2">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-8 w-28 rounded-lg bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="client-reviews"
        title="How Reviews works"
        steps={[
          { icon: "📋", title: "Eligible jobs", description: "Jobs appear here once escrow has been released — meaning the job is fully complete." },
          { icon: "⭐", title: "Rate 4 categories", description: "Score the provider on Quality of Work, Professionalism, Punctuality, and Communication." },
          { icon: "💬", title: "Write a comment", description: "Add an optional comment to give more context to your rating." },
          { icon: "🤝", title: "Help the community", description: "Your reviews help other clients choose reliable providers and reward great work." },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
          <p className="text-slate-500 text-sm mt-1">
            {reviewableJobs.length > 0
              ? `${reviewableJobs.length} job${reviewableJobs.length !== 1 ? "s" : ""} awaiting your review`
              : "Rate providers for your completed jobs."}
          </p>
        </div>
      </div>

      {reviewableJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Star className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No completed jobs to review yet.</p>
          <p className="text-slate-300 text-xs mt-1">Reviews become available once escrow is released for a job.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewableJobs.map((job) => (
            <div key={job._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-semibold text-slate-900 truncate">{job.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                      <Briefcase className="h-3 w-3" />{job.category}
                    </span>
                    {job.providerId?.name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />{job.providerId.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />Completed {formatDate(job.updatedAt)}
                    </span>
                    <span className="font-semibold text-slate-600">{formatCurrency(job.budget)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setReviewModal({ open: true, job });
                    setRating(5);
                    setFeedback("");
                    setHoveredRating(0);
                    setHoveredBreakdown({});
                    setBreakdown({ quality: 5, professionalism: 5, punctuality: 5, communication: 5 });
                  }}
                >
                  Leave Review
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={reviewModal.open} onClose={resetModal} title="Leave a Review">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            How was your experience with <strong>{reviewModal.job?.providerId?.name ?? "the provider"}</strong> on <strong>{reviewModal.job?.title}</strong>?
          </p>

          {/* Overall star rating */}
          <div>
            <p className="label mb-2">Overall Rating</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className={`text-3xl leading-none transition-all hover:scale-110 ${
                    star <= (hoveredRating || rating) ? "text-amber-400" : "text-slate-200"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-sm font-semibold text-slate-700">
                {["Terrible","Poor","Average","Good","Excellent"][(hoveredRating || rating) - 1]}
              </span>
            </div>
          </div>

          {/* Sub-category breakdown */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detailed Ratings</p>
            {([
              { key: "quality",         label: "Quality of Work" },
              { key: "professionalism", label: "Professionalism" },
              { key: "punctuality",     label: "Punctuality" },
              { key: "communication",   label: "Communication" },
            ] as { key: keyof typeof breakdown; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-slate-600 w-36 flex-shrink-0">{label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setBreakdown((prev) => ({ ...prev, [key]: star }))}
                      onMouseEnter={() => setHoveredBreakdown((prev) => ({ ...prev, [key]: star }))}
                      onMouseLeave={() => setHoveredBreakdown((prev) => { const n = { ...prev }; delete n[key]; return n; })}
                      className={`text-lg leading-none transition-all hover:scale-110 ${
                        star <= (hoveredBreakdown[key] ?? breakdown[key]) ? "text-amber-400" : "text-slate-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="label block mb-1">
              Feedback
              <span className={`ml-2 text-xs font-normal ${
                feedback.trim().length < 10 ? "text-slate-400" : "text-emerald-600"
              }`}>
                {feedback.trim().length}/500
              </span>
            </label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              placeholder="Describe your experience with this provider..."
              value={feedback}
              maxLength={500}
              onChange={(e) => setFeedback(e.target.value)}
            />
            {feedback.trim().length > 0 && feedback.trim().length < 10 && (
              <p className="text-xs text-red-500 mt-1">At least 10 characters required.</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={resetModal}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitReview}>Submit Review</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
