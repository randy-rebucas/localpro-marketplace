import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RecurringDetailClient } from "../_components/RecurringDetailClient";

export const metadata: Metadata = { title: "Recurring Schedule" };

export default async function RecurringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!user) redirect("/login");
  if (user.role !== "client") redirect("/dashboard");

  return (
    <div className="space-y-5">
      <Link
        href="/client/recurring"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Recurring Bookings
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule Details</h1>
        <p className="text-slate-500 text-sm mt-1">
          View and manage this recurring booking schedule.
        </p>
      </div>

      <RecurringDetailClient id={id} />
    </div>
  );
}
