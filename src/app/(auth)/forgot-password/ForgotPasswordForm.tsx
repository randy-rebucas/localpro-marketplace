"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold text-slate-900">Check your inbox</h2>
        <p className="text-slate-500 text-sm">
          If <strong>{email}</strong> is registered, you&apos;ll receive a reset link shortly.
          Check your spam folder if you don&apos;t see it.
        </p>
        <Link href="/login" className="block text-sm font-medium text-primary hover:text-primary-700 transition-colors mt-4">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot your password?</h2>
      <p className="text-slate-500 text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label block mb-1">Email address</label>
          <input
            id="email"
            type="email"
            className={`input w-full ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remember it?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>
    </>
  );
}
