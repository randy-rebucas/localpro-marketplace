import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import AdminUsersList from "./AdminUsersList";
import type { IUser } from "@/types";

export const metadata: Metadata = { title: "Manage Users" };


export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 50;

  const { users: rawUsers, total } = await userRepository.findPaginated({}, page, limit);

  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  })) as unknown as IUser[];
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
