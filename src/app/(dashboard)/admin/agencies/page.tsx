import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import AgenciesClient from "./AgenciesClient";
import { Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Agencies | Admin" };

export default async function AdminAgenciesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return notFound();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
          <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Agencies</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage provider agencies, plans, and owner accounts.
          </p>
        </div>
      </div>
      <AgenciesClient />
    </div>
  );
}
