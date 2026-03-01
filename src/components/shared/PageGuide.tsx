"use client";

import { useState, useEffect } from "react";
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";

export interface GuideStep {
  icon: string;
  title: string;
  description: string;
}

interface PageGuideProps {
  pageKey: string;
  title: string;
  steps: GuideStep[];
}

export default function PageGuide({ pageKey, title, steps }: PageGuideProps) {
  const storageKey = `guide_dismissed_${pageKey}`;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid hydration flash
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(storageKey) === "1";
    setDismissed(isDismissed);
    setOpen(!isDismissed);
    setMounted(true);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
    setOpen(false);
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-blue-100 transition-colors"
            title={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {open && (
        <div className="px-5 pb-4 border-t border-blue-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base leading-none">{step.icon}</span>
                    <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100 flex justify-end">
            <button
              onClick={dismiss}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Got it, hide guide →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
