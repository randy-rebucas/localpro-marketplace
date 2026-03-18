"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { useTranslations } from "next-intl";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = t("emailRequired");
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t("emailInvalid");
    if (!form.password) errs.password = t("passwordRequired");
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
        toast.error(data.error ?? t("loginFailed"));
        return;
      }

      setUser(data.user);
      toast.success(t("welcomeBackUser", { name: data.user.name }));

      const dashboardRole = data.user.role === "staff" ? "admin" : data.user.role;
      const destination = from ?? `/${dashboardRole}/dashboard`;
      router.push(destination);
    } catch {
      toast.error(tc("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">{t("welcomeBack")}</h2>
      <p className="text-slate-500 text-sm mb-6">{t("signInSubtitle")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label block mb-1">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            className={`input w-full ${errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="label">{t("password")}</label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary-700 transition-colors"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className={`input w-full ${errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-2.5"
          disabled={isLoading}
        >
          {isLoading ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t("dontHaveAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-700 transition-colors"
        >
          {t("createAccountLink")}
        </Link>
      </p>

    </>
  );
}
