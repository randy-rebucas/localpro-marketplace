import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { UserCog } from "lucide-react";
import StaffClient from "./StaffClient";

export const metadata: Metadata = { title: "Staff Management" };

export default async function AdminStaffPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const rawStaff = await userRepository.findAllStaff();

  const staff = rawStaff.map((s) => ({
    _id: String(s._id),
    name: s.name as string,
    email: s.email as string,
    capabilities: ((s as { capabilities?: string[] }).capabilities ?? []) as string[],
    isSuspended: s.isSuspended as boolean,
    createdAt:
      s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30">
          <UserCog className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Staff Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create and manage staff accounts with granular capability permissions.
          </p>
        </div>
      </div>
      <StaffClient initialStaff={staff} />
    </div>
  );
}
