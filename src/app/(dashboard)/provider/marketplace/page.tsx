"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { JobStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Spinner";
import type { IJob } from "@/types";

const CATEGORIES = [
  "All", "Plumbing", "Electrical", "Cleaning", "Landscaping",
  "Carpentry", "Painting", "Roofing", "HVAC", "Moving", "Handyman", "Other",
];

interface QuoteForm { proposedAmount: string; timeline: string; message: string; }

export default function MarketplacePage() {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; job: IJob | null }>({ open: false, job: null });
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({ proposedAmount: "", timeline: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: "open" });
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/jobs?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.data);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  async function submitQuote() {
    if (!quoteModal.job) return;
    if (!quoteForm.proposedAmount || isNaN(Number(quoteForm.proposedAmount))) {
      toast.error("Please enter a valid amount"); return;
    }
    if (!quoteForm.timeline.trim()) { toast.error("Timeline is required"); return; }
    if (quoteForm.message.length < 20) { toast.error("Message must be at least 20 characters"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobId: quoteModal.job._id,
          proposedAmount: Number(quoteForm.proposedAmount),
          timeline: quoteForm.timeline,
          message: quoteForm.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to submit quote"); return; }
      toast.success("Quote submitted!");
      setQuoteModal({ open: false, job: null });
      setQuoteForm({ proposedAmount: "", timeline: "", message: "" });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Marketplace</h2>
        <p className="text-slate-500 text-sm mt-0.5">Browse available jobs and submit quotes.</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === c ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No open jobs in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{job.title}</h3>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{job.category} · {job.location} · {formatDate(job.scheduleDate)}</p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{job.description}</p>
                </div>
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(job.budget)}</p>
                  <Button size="sm" onClick={() => { setQuoteModal({ open: true, job }); }}>
                    Submit Quote
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote modal */}
      <Modal isOpen={quoteModal.open} onClose={() => setQuoteModal({ open: false, job: null })} title="Submit a Quote">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Submitting quote for: <strong>{quoteModal.job?.title}</strong>
            <span className="ml-2 text-slate-400">(Budget: {formatCurrency(quoteModal.job?.budget ?? 0)})</span>
          </p>
          <div>
            <label className="label block mb-1">Your Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" min="1" className="input w-full pl-7"
                placeholder="450"
                value={quoteForm.proposedAmount}
                onChange={(e) => setQuoteForm((f) => ({ ...f, proposedAmount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label block mb-1">Timeline</label>
            <input className="input w-full" placeholder="e.g. 2-3 hours, 1 day"
              value={quoteForm.timeline}
              onChange={(e) => setQuoteForm((f) => ({ ...f, timeline: e.target.value }))} />
          </div>
          <div>
            <label className="label block mb-1">Message to Client</label>
            <textarea className="input w-full min-h-[100px] resize-none"
              placeholder="Introduce yourself and explain your approach..."
              value={quoteForm.message}
              onChange={(e) => setQuoteForm((f) => ({ ...f, message: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">{quoteForm.message.length}/1000</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setQuoteModal({ open: false, job: null })}>Cancel</Button>
            <Button isLoading={isSubmitting} onClick={submitQuote}>Submit Quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
