"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { IJob } from "@/types";

export default function ClientReviewsPage() {
  const [reviewableJobs, setReviewableJobs] = useState<IJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; job: IJob | null }>({
    open: false, job: null,
  });
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      try {
        // Get completed jobs with released escrow
        const res = await fetch("/api/jobs?status=completed", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();

        // Filter: escrow released
        const eligible = data.data.filter(
          (j: IJob) => j.escrowStatus === "released"
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
    if (!feedback.trim() || feedback.length < 10) {
      toast.error("Please write at least 10 characters of feedback");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId: reviewModal.job._id, rating, feedback }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to submit review"); return; }
      toast.success("Review submitted!");
      setReviewModal({ open: false, job: null });
      setFeedback(""); setRating(5);
      setReviewableJobs((prev) => prev.filter((j) => j._id !== reviewModal.job!._id));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
        <p className="text-slate-500 text-sm mt-0.5">Rate providers for completed jobs.</p>
      </div>

      {reviewableJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No completed jobs to review yet.
        </div>
      ) : (
        <div className="space-y-3">
          {reviewableJobs.map((job) => (
            <div key={job._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{job.category} · Completed {formatDate(job.createdAt)} · {formatCurrency(job.budget)}</p>
              </div>
              <Button size="sm" onClick={() => { setReviewModal({ open: true, job }); setRating(5); setFeedback(""); }}>
                Leave Review
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, job: null })} title="Leave a Review">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            How was your experience with <strong>{reviewModal.job?.title}</strong>?
          </p>

          {/* Star rating */}
          <div>
            <p className="label mb-2">Rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`text-2xl transition-colors ${star <= rating ? "text-amber-400" : "text-slate-300"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label block mb-1">Feedback</label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              placeholder="Describe your experience with this provider..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setReviewModal({ open: false, job: null })}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitReview}>Submit Review</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
