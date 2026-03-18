"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/fetchClient";
import { UserCheck, LogOut } from "lucide-react";

interface Props {
  /** Name of the user being impersonated (read from cookie by layout). */
  userName: string;
}

/**
 * Floating banner displayed at the top of every page when an admin is
 * impersonating another user. Renders client-side only (reads a cookie
 * that is intentionally non-httpOnly so JS can see it).
 */
export default function ImpersonationBanner({ userName }: Props) {
  const router = useRouter();
  const t = useTranslations("impersonationBanner");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);

  async function handleExit() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/impersonate/exit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? t("exitFailed")); return; }
      toast.success(t("exitSuccess"));
      router.push(data.redirectTo ?? "/admin/users");
      router.refresh();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 text-white text-sm px-4 py-2.5 shadow-md">
      <UserCheck size={15} className="shrink-0" />
      <span>
        {t("bannerTextPre")} <strong>{userName}</strong>{t("bannerTextPost")}
      </span>
      <button
        onClick={handleExit}
        disabled={loading}
        className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-colors disabled:opacity-50 text-xs"
      >
        <LogOut size={12} />
        {loading ? t("exitingBtn") : t("exitBtn")}
      </button>
    </div>
  );
}
