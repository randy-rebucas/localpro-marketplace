"use client";

import { useState, type ReactNode } from "react";

interface Props {
  jobsContent: ReactNode;
  categoriesContent: ReactNode;
}

export default function MarketplaceTabs({ jobsContent, categoriesContent }: Props) {
  const [tab, setTab] = useState<"jobs" | "categories">("jobs");

  return (
    <div>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit mb-8">
        <button
          onClick={() => setTab("jobs")}
          className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${
            tab === "jobs"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Latest Jobs
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`text-sm font-medium px-5 py-2 rounded-lg transition-all ${
            tab === "categories"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Browse by Service
        </button>
      </div>

      <div className={tab === "jobs" ? "block" : "hidden"}>{jobsContent}</div>
      <div className={tab === "categories" ? "block" : "hidden"}>{categoriesContent}</div>
    </div>
  );
}
