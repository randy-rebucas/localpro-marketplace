import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SavedCardClient } from "../_components/SavedCardClient";

export const metadata: Metadata = { title: "Saved Payment Card" };

export default async function SavedCardPage() {
  const user = await getCurrentUser();
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
        <h1 className="text-2xl font-bold text-slate-900">Saved Payment Card</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage the card used for auto-pay on your recurring jobs.
        </p>
      </div>

      <SavedCardClient />
    </div>
  );
}
