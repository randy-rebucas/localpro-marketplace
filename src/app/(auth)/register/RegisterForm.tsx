"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { trackRegistration, trackProviderRegistration } from "@/lib/analytics";
import { useTranslations } from "next-intl";

type Role = "client" | "provider";

const ROLES: { value: Role; label: string; description: string }[] = [];

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
    { value: "client",   label: t("client"),   description: t("clientDesc") },
    { value: "provider", label: t("provider"), description: t("providerDesc") },
  ];
  const [isLoading, setIsLoading] = useState(false);
  const refCode = searchParams.get("ref") ?? "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: (searchParams.get("role") === "provider" ? "provider" : "client") as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name || form.name.length < 2) errs.name = t("nameMin");
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = t("emailInvalid");
    if (!form.password || form.password.length < 8) {
      errs.password = t("passwordMin8");
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errs.password = t("passwordStrength");
    }
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(refCode ? { referralCode: refCode } : {}) }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? t("registrationFailed"));
        return;
      }

      setUser(data.user);
      toast.success(t("accountCreated"));
      // Fire analytics events
      trackRegistration({ role: data.user.role });
      if (data.user.role === "provider") trackProviderRegistration({ role: "provider" });
      // Providers go through the onboarding wizard first to set skills, service area and upload documents
      const destination = data.user.role === "provider" ? "/provider/onboarding" : `/${data.user.role}/dashboard`;
      router.push(destination);
    } catch {
      toast.error(tc("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">{t("createAccount")}</h2>
      <p className="text-slate-500 text-sm mb-6">{t("joinToday")}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selection */}
        <div>
          <p className="label mb-2">{t("iAmA")}...</p>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  form.role === r.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className={`text-sm font-medium ${form.role === r.value ? "text-primary" : "text-slate-700"}`}>
                  {r.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{r.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="label block mb-1">{t("fullName")}</label>
          <input
            id="name"
            type="text"
            className={`input w-full ${errors.name ? "border-red-400" : ""}`}
            placeholder="John Smith"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={isLoading}
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label block mb-1">{t("email")}</label>
          <input
            id="email"
            type="email"
            className={`input w-full ${errors.email ? "border-red-400" : ""}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label block mb-1">{t("password")}</label>
          <input
            id="password"
            type="password"
            className={`input w-full ${errors.password ? "border-red-400" : ""}`}
            placeholder="Min 8 chars, upper + lower + number"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
          {isLoading ? t("creatingAccount") : t("createAccount")}
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          {t("byCreatingAccount")}{" "}
          <Link href="/terms"   className="underline hover:text-primary transition-colors">{t("termsOfService")}</Link>
          {" "}{t("andAmpersand")}{" "}
          <Link href="/privacy" className="underline hover:text-primary transition-colors">{t("privacyPolicy")}</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-700 transition-colors">
          {t("signIn")}
        </Link>
      </p>

    </>
  );
}
