import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Create and manage staff accounts with granular capability permissions.
        </p>
      </div>
      <StaffClient initialStaff={staff} />
    </div>
  );
}
