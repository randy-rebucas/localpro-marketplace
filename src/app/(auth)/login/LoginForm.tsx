"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { DisciplinaryNotice } from "@/components/shared/DisciplinaryNotice";
import {
  DISCIPLINARY_SUPPORT_EMAIL,
  SUSPENDED_ACCOUNT_POLICY_LINKS,
  isSuspendedAuthMessage,
} from "@/lib/disciplinary-notice";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied:         "Sign-in was cancelled.",
  oauth_state_mismatch: "Session expired. Please try again.",
  oauth_token_exchange: "Could not complete sign-in. Please try again.",
  oauth_profile_fetch:  "Could not retrieve your profile. Please try again.",
  oauth_no_email:       "Your account has no verified email. Please sign up with email instead.",
  too_many_attempts:    "Too many attempts. Please wait a moment and try again.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [suspendedNotice, setSuspendedNotice] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "suspended") {
      setSuspendedNotice(true);
      toast.error("Account suspended — see notice below.");
    } else if (err) {
      toast.error(OAUTH_ERRORS[err] ?? "Sign-in failed. Please try again.");
    }
    if (err) {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.password) errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (isSuspendedAuthMessage(data.error)) {
          setSuspendedNotice(true);
          toast.error("Account suspended — see notice below.");
          return;
        }
        toast.error(data.error ?? "Login failed");
        return;
      }

      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);

      const dashboardRole = data.user.role === "staff" ? "admin" : data.user.role;
      const destination = from ?? `/${dashboardRole}/dashboard`;
      router.push(destination);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {suspendedNotice && (
        <div className="mb-6">
          <DisciplinaryNotice
            tone="red"
            title="Account suspended"
            reasonHeading="Reason for this action"
            reasonBody="Sign-in is blocked because your account has been suspended under LocalPro policies. Suspensions follow review of account activity against our Terms of Service and, depending on your role, your Provider or Client Agreement."
            evidenceLines={[
              "Supporting detail may include documented activity such as reviews, disputes, verification outcomes, fraud signals, or administrative findings. Specific facts retained on your case can be discussed when you contact Trust & Safety.",
            ]}
            policyLinks={SUSPENDED_ACCOUNT_POLICY_LINKS}
            appealHeading="Appeal or possible reactivation"
            appealLines={[
              `Use the Help Center (/support) to open a ticket and reference your registered email.`,
              `Email ${DISCIPLINARY_SUPPORT_EMAIL} with the subject line \"Suspension appeal\", include your registered email, and any evidence that supports reinstatement.`,
              "If reactivation is available for your case, the team will explain remediation steps or timelines after review. Decisions are made case-by-case under the cited agreements.",
            ]}
          />
        </div>
      )}
      <h2 className="mb-1 text-4xl font-extrabold tracking-tight text-[#0a2440]">Welcome back!</h2>
      <p className="mb-6 text-base text-slate-600">Log in to your account to continue</p>



      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.email ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-slate-200"}`}
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-600">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${errors.password ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-slate-200"}`}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          Remember me
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium">or continue with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/auth/google"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <svg viewBox="0 0 48 48" aria-hidden className="h-4 w-4">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google
        </a>
        <a
          href="/api/auth/facebook"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
            <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85V15.47H7.08V12h3.04V9.41c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" />
          </svg>
          Facebook
        </a>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          Sign up
        </Link>
      </p>

    </>
  );
}
