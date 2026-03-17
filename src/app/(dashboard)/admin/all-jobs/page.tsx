import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { jobRepository } from "@/repositories/job.repository";
import type { JobSortOption } from "@/repositories/job.repository";
import type { JobStatus } from "@/types";
import AdminAllJobsClient, { type SerializedAllJob } from "./AdminAllJobsClient";

export const metadata: Metadata = { title: "All Jobs" };

const ALL_STATUSES: JobStatus[] = [
  "pending_validation", "open", "assigned", "in_progress", "completed",
  "disputed", "refunded", "rejected", "expired", "cancelled",
];

const SORT_VALUES: JobSortOption[] = ["newest", "oldest", "budget_desc", "budget_asc"];
const LIMIT_OPTIONS = [20, 50, 100];

export default async function AdminAllJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; sort?: string; limit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "staff")) return null;

  const { status, page: pageStr, q, sort: sortParam, limit: limitParam } = await searchParams;

  const page  = Math.max(1, parseInt(pageStr  ?? "1",  10));
  const limit = LIMIT_OPTIONS.includes(parseInt(limitParam ?? "20", 10)) ? parseInt(limitParam!, 10) : 20;
  const sort  = SORT_VALUES.includes(sortParam as JobSortOption) ? (sortParam as JobSortOption) : "newest";

  const filter: Record<string, unknown> = {};
  if (status && ALL_STATUSES.includes(status as JobStatus)) filter.status = status;
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.title = { $regex: escaped, $options: "i" };
  }

  const [result, statusCounts] = await Promise.all([
    jobRepository.findPaginated(filter as never, { page, limit, sort }),
    jobRepository.countByStatus(),
  ]);

  const countMap = Object.fromEntries(statusCounts.map((r) => [r._id, r.count]));
  const totalAll = Object.values(countMap).reduce((a, b) => a + b, 0);

  const raw = result.data as unknown as {
    _id: { toString(): string };
    title: string;
    category: string;
    location: string;
    budget: number;
    status: JobStatus;
    escrowStatus: string;
    scheduleDate?: Date | null;
    createdAt: Date;
    clientId: { name: string } | null;
    providerId?: { name: string } | null;
  }[];

  const jobs: SerializedAllJob[] = raw.map((j) => ({
    id:           j._id.toString(),
    title:        j.title,
    category:     j.category,
    location:     j.location,
    budget:       j.budget,
    status:       j.status,
    escrowStatus: j.escrowStatus as import("@/types").EscrowStatus,
    scheduleDate: j.scheduleDate instanceof Date ? j.scheduleDate.toISOString() : (j.scheduleDate ?? null),
    createdAt:    j.createdAt instanceof Date ? j.createdAt.toISOString() : String(j.createdAt),
    clientName:   j.clientId?.name ?? null,
    providerName: j.providerId?.name ?? null,
  }));

  return (
    <AdminAllJobsClient
      jobs={jobs}
      total={result.total}
      page={page}
      totalPages={result.totalPages}
      limit={limit}
      sort={sort}
      status={status ?? ""}
      q={q ?? ""}
      countMap={countMap}
      totalAll={totalAll}
    />
  );
}
