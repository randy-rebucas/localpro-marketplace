import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import type { UserSortOption } from "@/repositories/user.repository";
import AdminUsersList from "./AdminUsersList";
import TourGuide from "@/components/shared/TourGuide";
import { Users } from "lucide-react";
import type { IUser } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage Users" };

const VALID_ROLES    = ["client", "provider", "admin"] as const;
const VALID_SORTS    = ["newest", "oldest", "name_asc", "name_desc"] as const;
const VALID_LIMITS   = [25, 50, 100] as const;
const VALID_KYC      = ["none", "pending", "approved", "rejected"] as const;
type FilterRole = "all" | (typeof VALID_ROLES)[number];
type KycFilter  = "all" | (typeof VALID_KYC)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string; search?: string; sort?: string; limit?: string; kyc?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const params = await searchParams;

  const page  = Math.max(1, parseInt(params.page  ?? "1",  10) || 1);
  const limit = (VALID_LIMITS as readonly number[]).includes(Number(params.limit))
    ? Number(params.limit) as (typeof VALID_LIMITS)[number]
    : 50;
  const sort: UserSortOption = (VALID_SORTS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as UserSortOption)
    : "newest";

  const roleParam  = params.role ?? "all";
  const roleFilter: FilterRole = (VALID_ROLES as readonly string[]).includes(roleParam)
    ? (roleParam as FilterRole) : "all";

  const kycParam = params.kyc ?? "all";
  const kycFilter: KycFilter = (VALID_KYC as readonly string[]).includes(kycParam)
    ? (kycParam as KycFilter) : "all";

  const searchQuery = (params.search ?? "").trim();

  const dbFilter: Record<string, unknown> = {};
  if (roleFilter !== "all") dbFilter.role = roleFilter;
  if (kycFilter  !== "all") dbFilter.kycStatus = kycFilter;
  if (searchQuery) {
    const regex = { $regex: searchQuery, $options: "i" };
    dbFilter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const [{ users: rawUsers, total }, userStats] = await Promise.all([
    userRepository.findPaginated(dbFilter, page, limit, sort),
    userRepository.getUserStats(),
  ]);

  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    addresses: (u.addresses ?? []).map((a) => ({ ...a, _id: a._id.toString() })),
  })) as unknown as IUser[];

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">User Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString()} user{total !== 1 ? "s" : ""} in current filter</p>
        </div>
      </div>
      <TourGuide
        pageKey="admin-users"
        title="How User Management works"
        steps={[
          { icon: "👤", title: "Filter & search",      description: "Use role tabs, KYC status, and the search box to narrow down to the exact users you need." },
          { icon: "✅", title: "Approve providers",     description: "New provider accounts need manual approval before they can receive jobs." },
          { icon: "📦", title: "Bulk actions",          description: "Select multiple users to verify, suspend, approve, message, or delete them at once." },
          { icon: "📄", title: "Export / import",       description: "Download a filtered CSV of users, or import users from a spreadsheet in bulk." },
        ]}
      />
      <AdminUsersList
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={limit}
        sort={sort}
        roleFilter={roleFilter}
        kycFilter={kycFilter}
        searchQuery={searchQuery}
        userStats={userStats}
        currentUserRole={user.role}
      />
    </div>
  );
}
