import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import TourGuide from "@/components/shared/TourGuide";
import { RecurringList } from "./_components/RecurringList";

export const metadata: Metadata = { title: "Recurring Bookings" };

export default async function ClientRecurringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");
  const t = await getTranslations("clientPages");

  return (
    <div className="space-y-6">
      <TourGuide
        pageKey="client-recurring"
        title="How Recurring Bookings work"
        steps={[
          {
            icon: "🔁",
            title: "Choose a service & frequency",
            description:
              "Select from Cleaning, Maintenance, Landscaping, or Pest Control and pick weekly or monthly.",
          },
          {
            icon: "📅",
            title: "Set your first date",
            description:
              "Jobs are auto-posted on schedule so you never have to remember to rebook.",
          },
          {
            icon: "⏸️",
            title: "Pause anytime",
            description:
              "Going on vacation? Pause your schedule with one click and resume when ready.",
          },
          {
            icon: "💳",
            title: "Auto-pay reminders",
            description:
              "Enable auto-pay notifications so you get prompted to fund escrow as soon as each job is posted.",
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("recurring")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t("recurringSub")}
          </p>
        </div>
        <Link
          href="/client/recurring/new"
          className="btn-primary sm:shrink-0 w-full sm:w-auto text-center"
        >
          {t("newSchedule")}
        </Link>
      </div>

      {/* List + form */}
      <RecurringList />
    </div>
  );
}
