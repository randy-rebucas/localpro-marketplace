"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <WifiOff className="mx-auto h-20 w-20 text-slate-200" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">You&apos;re offline</h1>
        <p className="mt-3 text-slate-500 text-sm">
          Check your internet connection and try again. Some pages may still be
          available from your local cache.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-block btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
