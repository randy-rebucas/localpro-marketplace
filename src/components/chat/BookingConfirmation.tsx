"use client";

import { X, CheckCircle, AlertCircle } from "lucide-react";

interface BookingConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  booking: {
    jobTitle: string;
    jobBudget: string;
    jobCategory: string;
    jobLocation: string;
    providerName: string;
    providerRating: string;
    providerJobs: number;
    matchScore: number;
    reason: string;
  };
  isLoading?: boolean;
}

export default function BookingConfirmation({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading = false,
}: BookingConfirmationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-4 flex items-center justify-between border-b border-primary-dark/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Confirm Booking</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-white/20 rounded-lg p-1 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Match Score */}
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-200">
                Excellent Match!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {booking.reason}
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {booking.matchScore}%
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">Match Score</p>
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Job Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Job Title
                </p>
                <p className="font-medium text-slate-900 dark:text-white mt-1">
                  {booking.jobTitle}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Category
                </p>
                <p className="font-medium text-slate-900 dark:text-white mt-1">
                  {booking.jobCategory}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Budget
                </p>
                <p className="font-bold text-green-600 dark:text-green-400 text-lg mt-1">
                  {booking.jobBudget}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Location
                </p>
                <p className="font-medium text-slate-900 dark:text-white mt-1">
                  {booking.jobLocation}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Assigned Provider</h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {booking.providerName}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500">★ {booking.providerRating}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {booking.providerJobs}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Jobs Completed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Secure Payment Protection
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Your payment is secured in escrow until the job is completed and approved.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium"
          >
            {isLoading ? "Processing..." : "Confirm & Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
