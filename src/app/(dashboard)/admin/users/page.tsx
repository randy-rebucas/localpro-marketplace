import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminUsersList from "./AdminUsersList";
import type { IUser } from "@/types";

export const metadata: Metadata = { title: "Manage Users" };


export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 50;

  await connectDB();

  const [rawUsers, total] = await Promise.all([
    User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  const users = JSON.parse(JSON.stringify(rawUsers)) as IUser[];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{total} total users</p>
      </div>
      <AdminUsersList users={users} total={total} page={page} totalPages={totalPages} />
    </div>
  );
}
