"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { useTranslations } from "next-intl";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("noVerificationToken"));
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
          setMessage(t("verifiedRedirecting"));
          setTimeout(() => router.push("/login"), 2500);
        } else {
          setStatus("error");
          setMessage(data.error ?? t("verificationFailedDefault"));
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage(tc("somethingWentWrong"));
      });
  }, [token, router]);

  return (
    <div className="text-center space-y-4">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
          <h2 className="text-xl font-semibold text-slate-900">{t("verifyingEmail")}</h2>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900">{t("emailVerifiedTitle")}</h2>
          <p className="text-slate-500 text-sm">{message}</p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-900">{t("verificationFailedTitle")}</h2>
          <p className="text-slate-500 text-sm">{message}</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-medium text-primary hover:text-primary-700 transition-colors"
          >
            {t("backToLogin")}
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
