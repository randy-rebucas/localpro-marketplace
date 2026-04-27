import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import {
  MapPin,
  Briefcase,
  PhilippinePeso,
  CalendarDays,
  Search,
  ArrowRight,
} from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Browse Jobs | LocalPro",
  description:
    "Explore open service jobs across the Philippines. Find plumbing, electrical, carpentry, cleaning, and more — posted by clients seeking trusted local professionals.",
  openGraph: {
    title: "Browse Jobs | LocalPro",
    description:
      "Find local service jobs near you. Apply as a verified provider on LocalPro.",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";
const PAGE_SIZE = 24;

interface PublicJob {
  _id: string;
  title: string;
  category: string;
  location: string;
  budget: number;
  scheduleDate?: string;
  status: string;
  createdAt: string;
}

async function getJobs(
  search: string,
  category: string,
  page: number
): Promise<{ jobs: PublicJob[]; total: number; categories: string[] }> {
  try {
    await connectDB();

    const filter: Record<string, unknown> = { status: "open" };
    if (search) filter.title = { $regex: search, $options: "i" };
    if (category) filter.category = category;

    const [jobs, total, allCategories] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select("_id title category location budget scheduleDate status createdAt")
        .lean(),
      Job.countDocuments(filter),
      Job.distinct("category", { status: "open" }),
    ]);

    return {
      jobs: JSON.parse(JSON.stringify(jobs)) as PublicJob[],
      total,
      categories: (allCategories as string[]).sort(),
    };
  } catch {
    return { jobs: [], total: 0, categories: [] };
  }
}

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() ?? "";
  const category = sp.category?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const { jobs, total, categories } = await getJobs(search, category, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/jobs${q ? `?${q}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home",        item: "https://www.localpro.asia" },
              { "@type": "ListItem", position: 2, name: "Browse Jobs", item: "https://www.localpro.asia/jobs" },
            ],
          }),
        }}
      />
      {/* Header */}
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Browse Open Jobs
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            {total.toLocaleString()} open job{total !== 1 ? "s" : ""} across the Philippines.
            Find your next project today.
          </p>

          {/* Search form */}
          <form method="GET" action="/jobs" className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="Search job titles…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="max-w-site mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-52 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Category
          </p>
          <Link
            href={pageUrl(1).replace(/&?category=[^&]*/g, "").replace(/\?$/, "")}
            className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
              !category
                ? "bg-primary text-white font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Categories
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/jobs?${new URLSearchParams({ ...(search ? { q: search } : {}), category: cat }).toString()}`}
              className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                category === cat
                  ? "bg-primary text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
            </Link>
          ))}
        </aside>

        {/* Job grid */}
        <div className="flex-1 min-w-0">
          {jobs.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No open jobs found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <Link
                  key={job._id}
                  href={`/jobs/${job._id}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {job.category}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(job.createdAt)}</span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {job.title}
                  </h2>
                  <div className="space-y-1 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {job.location}
                    </div>
                    {job.scheduleDate && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(job.scheduleDate)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm font-bold text-primary">
                      <PhilippinePeso className="h-4 w-4" />
                      {formatPeso(job.budget)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-semibold mt-1 group-hover:gap-2 transition-all">
                    View Job <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA footer */}
      <section className="bg-gradient-to-r from-primary to-blue-700 text-white py-12 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold">Are you a service professional?</h2>
          <p className="text-blue-100">
            Join LocalPro as a provider. Get matched with clients, submit quotes, and get paid securely with escrow.
          </p>
          <Link
            href="/register?role=provider"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors"
          >
            Apply as a Provider <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
