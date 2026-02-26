import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { formatDate } from "@/lib/utils";
import UserActions from "./UserActions";
import type { IUser } from "@/types";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();

  const users = await User.find()
    .sort({ createdAt: -1 })
    .lean() as unknown as IUser[];

  const totals = {
    client: users.filter((u) => u.role === "client").length,
    provider: users.filter((u) => u.role === "provider").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {users.length} total users · {totals.client} clients · {totals.provider} providers · {totals.admin} admins
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id.toString()} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`badge capitalize ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "provider" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {u.isVerified && <span className="badge bg-green-100 text-green-700">Verified</span>}
                      {u.isSuspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
                      {!u.isVerified && !u.isSuspended && <span className="badge bg-slate-100 text-slate-500">Unverified</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-6 py-4">
                    <UserActions
                      userId={u._id.toString()}
                      isVerified={u.isVerified}
                      isSuspended={u.isSuspended}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
