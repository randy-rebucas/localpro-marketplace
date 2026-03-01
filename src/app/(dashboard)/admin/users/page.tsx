import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import AdminUsersList from "./AdminUsersList";
import type { IUser } from "@/types";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Manage Users" };


export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 50;

  const { users: rawUsers, total } = await userRepository.findPaginated({}, page, limit);

  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    addresses: (u.addresses ?? []).map((a) => ({
      ...a,
      _id: a._id ? a._id.toString() : undefined,
    })),
  })) as unknown as IUser[];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="admin-users"
        title="How User Management works"
        steps={[
          { icon: "🔍", title: "Search & filter", description: "Search users by name or email, and filter by role (client, provider, admin) to find accounts quickly." },
          { icon: "🚫", title: "Suspend accounts", description: "Suspended users cannot log in. Use this for policy violations or fraud prevention." },
          { icon: "🛡️", title: "View KYC status", description: "Providers show their KYC verification status — pending, approved, or rejected." },
          { icon: "📅", title: "Registration history", description: "See when each user registered and their last activity to identify inactive or suspicious accounts." },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{total} total users</p>
      </div>
      <AdminUsersList users={users} total={total} page={page} totalPages={totalPages} />
    </div>
  );
}
