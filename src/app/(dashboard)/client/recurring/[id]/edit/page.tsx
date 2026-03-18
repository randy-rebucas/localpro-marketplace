import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditRecurringClient } from "../../_components/EditRecurringClient";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Edit Recurring Schedule" };

export default async function EditRecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  const t = await getTranslations("clientPages");

  return (
    <div className="space-y-5">
      <Link
        href={`/client/recurring/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("backToSchedule")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("editSchedule")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("editScheduleSub")}
        </p>
      </div>

      <EditRecurringClient id={id} />
    </div>
  );
}
