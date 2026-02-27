import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminUsersList from "./AdminUsersList";
import type { IUser } from "@/types";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const users = JSON.parse(
    JSON.stringify(await User.find().sort({ createdAt: -1 }).lean())
  ) as IUser[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{users.length} total users</p>
      </div>
      <AdminUsersList users={users} />
    </div>
  );
}
