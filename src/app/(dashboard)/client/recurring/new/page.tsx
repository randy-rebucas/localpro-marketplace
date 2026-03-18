import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewRecurringClient } from "../_components/NewRecurringClient";

export const metadata: Metadata = { title: "New Recurring Schedule" };

export default async function NewRecurringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const t = await getTranslations("clientPages");

  return (
    <div className="space-y-5">
      <Link
        href="/client/recurring"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("backToRecurring")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("newRecurring")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("newRecurringSub")}
        </p>
      </div>

      <NewRecurringClient />
    </div>
  );
}
