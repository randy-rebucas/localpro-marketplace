"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/fetchClient";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { IReview } from "@/types";
import TourGuide from "@/components/shared/TourGuide";
import { Briefcase, User, Calendar, Star } from "lucide-react";

const Modal = dynamic(() => import("@/components/ui/Modal"), { ssr: false });

export interface PopulatedJob {
  _id: string;
  title: string;
  category: string;
  budget: number;
  escrowStatus: string;
  updatedAt: Date | string;
  providerId?: { _id: string; name: string } | null;
}

const DEFAULT_BREAKDOWN = { quality: 5, professionalism: 5, punctuality: 5, communication: 5 };

interface Props {
  initialJobs: PopulatedJob[];
}

export default function ReviewsClient({ initialJobs }: Props) {
  const t = useTranslations("clientPages");
  const [reviewableJobs, setReviewableJobs] = useState<PopulatedJob[]>(initialJobs);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; job: PopulatedJob | null }>({
    open: false, job: null,
  });
  const [rating, setRating] = useState(5);
  const [breakdown, setBreakdown] = useState(DEFAULT_BREAKDOWN);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredBreakdown, setHoveredBreakdown] = useState<Record<string, number>>({});

  async function submitReview() {
    if (!reviewModal.job) return;
    const trimmed = feedback.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error(t("clientReviews_toastMinChars"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: reviewModal.job._id, rating, feedback: trimmed, breakdown }),
      });
      const data = await res.json() as IReview & { error?: string };
      if (!res.ok) { toast.error(data.error ?? t("clientReviews_toastFailed")); return; }
      toast.success(t("clientReviews_toastSuccess"));
      resetModal();
      setReviewableJobs((prev) => prev.filter((j) => j._id !== reviewModal.job!._id));
    } catch {
      toast.error(t("clientReviews_toastError"));
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
    setBreakdown(DEFAULT_BREAKDOWN);
  }

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-reviews"
        title={t("clientReviews_tourTitle")}
        steps={[
          { icon: "📋", title: t("clientReviews_tourStep1Title"), description: t("clientReviews_tourStep1Desc") },
          { icon: "⭐", title: t("clientReviews_tourStep2Title"), description: t("clientReviews_tourStep2Desc") },
          { icon: "💬", title: t("clientReviews_tourStep3Title"), description: t("clientReviews_tourStep3Desc") },
          { icon: "🤝", title: t("clientReviews_tourStep4Title"), description: t("clientReviews_tourStep4Desc") },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t("clientReviews_heading")}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {reviewableJobs.length > 0
              ? (reviewableJobs.length !== 1
                  ? t("clientReviews_subWaitingPlural", { count: reviewableJobs.length })
                  : t("clientReviews_subWaiting", { count: reviewableJobs.length }))
              : t("clientReviews_subEmpty")}
          </p>
        </div>
      </div>

      {reviewableJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Star className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">{t("clientReviews_emptyTitle")}</p>
          <p className="text-slate-300 text-xs mt-1">{t("clientReviews_emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewableJobs.map((job) => (
            <div key={job._id} className="bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold text-slate-900 truncate">{job.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                      <Briefcase className="h-3 w-3" />{job.category}
                    </span>
                    {job.providerId?.name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />{job.providerId.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{formatDate(job.updatedAt)}
                    </span>
                    <span className="font-semibold text-slate-600">{formatCurrency(job.budget)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setReviewModal({ open: true, job });
                    setRating(5);
                    setFeedback("");
                    setHoveredRating(0);
                    setHoveredBreakdown({});
                    setBreakdown(DEFAULT_BREAKDOWN);
                  }}
                >
                  {t("clientReviews_btnLeaveReview")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={reviewModal.open} onClose={resetModal} title={t("clientReviews_modalTitle")}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("clientReviews_modalPrompt", { provider: reviewModal.job?.providerId?.name ?? "the provider", job: reviewModal.job?.title ?? "" })}
          </p>

          {/* Overall star rating */}
          <div>
            <p className="label mb-2">{t("clientReviews_labelOverall")}</p>
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
                {[t("clientReviews_ratingTerrible"),t("clientReviews_ratingPoor"),t("clientReviews_ratingAverage"),t("clientReviews_ratingGood"),t("clientReviews_ratingExcellent")][(hoveredRating || rating) - 1]}
              </span>
            </div>
          </div>

          {/* Sub-category breakdown */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("clientReviews_detailedRatings")}</p>
            {([
              { key: "quality",         label: t("clientReviews_labelQuality") },
              { key: "professionalism", label: t("clientReviews_labelProfessionalism") },
              { key: "punctuality",     label: t("clientReviews_labelPunctuality") },
              { key: "communication",   label: t("clientReviews_labelCommunication") },
            ] as { key: keyof typeof breakdown; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 min-w-[90px] sm:w-36 flex-shrink-0">{label}</span>
                <div className="flex gap-0.5 sm:gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setBreakdown((prev) => ({ ...prev, [key]: star }))}
                      onMouseEnter={() => setHoveredBreakdown((prev) => ({ ...prev, [key]: star }))}
                      onMouseLeave={() => setHoveredBreakdown((prev) => { const n = { ...prev }; delete n[key]; return n; })}
                      className={`text-xl sm:text-2xl leading-none transition-all hover:scale-110 ${
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
              {t("clientReviews_labelFeedback")}
              <span className={`ml-2 text-xs font-normal ${
                feedback.trim().length < 10 ? "text-slate-400" : "text-emerald-600"
              }`}>
                {feedback.trim().length}/500
              </span>
            </label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              placeholder={t("clientReviews_feedbackPlaceholder")}
              value={feedback}
              maxLength={500}
              onChange={(e) => setFeedback(e.target.value)}
            />
            {feedback.trim().length > 0 && feedback.trim().length < 10 && (
              <p className="text-xs text-red-500 mt-1">{t("clientReviews_feedbackMin")}</p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={resetModal}>{t("clientReviews_btnCancel")}</Button>
            <Button className="w-full sm:w-auto" isLoading={isSubmitting} onClick={submitReview}>{t("clientReviews_btnSubmit")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
