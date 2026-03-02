import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import AdminUsersList from "./AdminUsersList";
import type { IUser } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage Users" };

const VALID_ROLES = ["client", "provider", "admin"] as const;
type FilterRole = "all" | (typeof VALID_ROLES)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = 50;

  const roleParam = params.role ?? "all";
  const roleFilter: FilterRole = (VALID_ROLES as readonly string[]).includes(roleParam)
    ? (roleParam as FilterRole)
    : "all";

  const searchQuery = (params.search ?? "").trim();

  const dbFilter: Record<string, unknown> = roleFilter === "all" ? {} : { role: roleFilter };
  if (searchQuery) {
    const regex = { $regex: searchQuery, $options: "i" };
    dbFilter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const { users: rawUsers, total } = await userRepository.findPaginated(dbFilter, page, limit);

  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    addresses: (u.addresses ?? []).map((a) => ({
          ...a,
          _id: a._id.toString(),
        })),
  })) as unknown as IUser[];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{total} total users</p>
      </div>
      <AdminUsersList
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        roleFilter={roleFilter}
        searchQuery={searchQuery}
      />
    </div>
  );
}
