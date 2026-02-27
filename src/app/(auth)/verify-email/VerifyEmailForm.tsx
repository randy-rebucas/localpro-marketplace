"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success");
          setMessage("Your email has been verified! Redirecting to login…");
          setTimeout(() => router.push("/login"), 2500);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed. The link may have expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, router]);

  return (
    <div className="text-center space-y-4">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
          <h2 className="text-xl font-semibold text-slate-900">Verifying your email…</h2>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900">Email Verified!</h2>
          <p className="text-slate-500 text-sm">{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900">Verification Failed</h2>
          <p className="text-slate-500 text-sm">{message}</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-medium text-primary hover:text-primary-700 transition-colors"
          >
            Back to login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailForm() {
  return (
    <Suspense fallback={<Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
