"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { MailX } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";

  if (!success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <MailX className="mx-auto h-20 w-20 text-slate-200" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Unsubscribe</h1>
          <p className="mt-3 text-slate-500 text-sm">
            Something went wrong. The unsubscribe link may be invalid or expired.
            Please try clicking the link from your email again.
          </p>
          <Link href="/" className="mt-6 inline-block btn-primary">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <MailX className="mx-auto h-20 w-20 text-emerald-300" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          You&apos;ve been unsubscribed
        </h1>
        <p className="mt-3 text-slate-500 text-sm">
          You will no longer receive marketing emails from LocalPro. You will
          still receive important transactional emails about your account, jobs,
          and payments.
        </p>
        <Link href="/" className="mt-6 inline-block btn-primary">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
