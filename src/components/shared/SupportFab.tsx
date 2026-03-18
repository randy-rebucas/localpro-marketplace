"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Headphones } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { usePathname } from "next/navigation";

export default function SupportFab() {
  const { user } = useAuthStore();
  const t = useTranslations("supportFab");
  const pathname = usePathname();

  const href =
    user?.role === "provider" ? "/provider/support" :
    user?.role === "admin" || user?.role === "staff" ? "/admin/support" :
    "/client/support";

  // Hide the FAB when already on the support page
  if (pathname.startsWith(href)) return null;

  return (
    <Link
      href={href}
      aria-label={t("ariaLabel")}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-3 group"
    >
      <Headphones className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline">{t("label")}</span>
    </Link>
  );
}
