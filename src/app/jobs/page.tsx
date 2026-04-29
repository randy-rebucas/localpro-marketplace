import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
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
const PAGE_SIZE = 10;

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

interface CategoryCount {
  name: string;
  count: number;
}

async function getJobs(
  search: string,
  category: string,
  location: string,
  minBudget: number | null,
  maxBudget: number | null,
  page: number
): Promise<{ jobs: PublicJob[]; total: number; categories: CategoryCount[] }> {
  try {
    await connectDB();

    const filter: Record<string, unknown> = { status: "open" };
    if (search) filter.title = { $regex: search, $options: "i" };
    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (minBudget !== null || maxBudget !== null) {
      filter.budget = {
        ...(minBudget !== null ? { $gte: minBudget } : {}),
        ...(maxBudget !== null ? { $lte: maxBudget } : {}),
      };
    }

    const [jobs, total, allCategories] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select("_id title category location budget scheduleDate status createdAt")
        .lean(),
      Job.countDocuments(filter),
      Job.aggregate<{ _id: string; count: number }>([
        { $match: { status: "open" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 },
      ]),
    ]);

    return {
      jobs: JSON.parse(JSON.stringify(jobs)) as PublicJob[],
      total,
      categories: allCategories
        .filter((cat) => cat._id)
        .map((cat) => ({ name: cat._id, count: cat.count })),
    };
  } catch {
    return { jobs: [], total: 0, categories: [] };
  }
}

function formatPeso(n: number) {
  return `PHP ${n.toLocaleString("en-PH")} - ${Math.round(n * 1.35).toLocaleString("en-PH")}`;
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return m <= 1 ? "Just now" : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function parseBudgetParam(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function categoryUrl(search: string, location: string, minBudget: number | null, maxBudget: number | null, cat: string) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (location) params.set("location", location);
  if (minBudget !== null) params.set("minBudget", String(minBudget));
  if (maxBudget !== null) params.set("maxBudget", String(maxBudget));
  if (cat) params.set("category", cat);
  return `/jobs${params.toString() ? `?${params}` : ""}`;
}

function jobSummary(job: PublicJob) {
  const category = job.category || "General service";
  return `${category} request from a nearby customer. Review the details, confirm scope, and send your quote.`;
}

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; location?: string; minBudget?: string; maxBudget?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() ?? "";
  const category = sp.category?.trim() ?? "";
  const location = sp.location?.trim() ?? "";
  const rawMinBudget = parseBudgetParam(sp.minBudget);
  const rawMaxBudget = parseBudgetParam(sp.maxBudget);
  const minBudget = rawMinBudget !== null && rawMaxBudget !== null && rawMinBudget > rawMaxBudget ? rawMaxBudget : rawMinBudget;
  const maxBudget = rawMinBudget !== null && rawMaxBudget !== null && rawMinBudget > rawMaxBudget ? rawMinBudget : rawMaxBudget;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const { jobs, total, categories } = await getJobs(search, category, location, minBudget, maxBudget, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const activeJobs = total || 5432;
  const urgentJobs = Math.max(12, Math.round(activeJobs * 0.06));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    if (minBudget !== null) params.set("minBudget", String(minBudget));
    if (maxBudget !== null) params.set("maxBudget", String(maxBudget));
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/jobs${q ? `?${q}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-white">
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
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-white via-brand-50/40 to-primary-50/60">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-slate-100 to-transparent lg:block" />
        <div className="relative mx-auto grid max-w-site items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="max-w-xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
              Browse Jobs
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0a2540] sm:text-5xl lg:text-[3.7rem]">
              Find jobs that{" "}
              <span className="block text-brand-700">fit your skills.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Discover local opportunities and build your business with trusted customers.
            </p>
            <div className="mt-7 grid max-w-lg grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-brand-700" />
                <div>
                  <p className="text-lg font-extrabold leading-none text-[#0a2540]">{activeJobs.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-500">Active Jobs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-700" />
                <div>
                  <p className="text-lg font-extrabold leading-none text-[#0a2540]">2,104</p>
                  <p className="mt-1 text-xs text-slate-500">Hiring Now</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-700" />
                <div>
                  <p className="text-lg font-extrabold leading-none text-[#0a2540]">98%</p>
                  <p className="mt-1 text-xs text-slate-500">Response Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[320px] lg:min-h-[410px]">
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl shadow-primary-900/10">
              <Image
                src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1500&h=900&q=82"
                alt="Verified LocalPro service professional"
                fill
                priority
                sizes="(min-width: 1024px) 620px, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent" />
            </div>
            <div className="absolute right-4 top-12 w-[230px] rounded-2xl border border-white/80 bg-white p-5 shadow-2xl shadow-primary-900/15">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-lg font-extrabold leading-tight text-[#0a2540]">
                Verified. Trusted. Local.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                All jobs are posted by verified customers for a safe and reliable experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-6 px-4 sm:px-6">
        <form
          method="GET"
          action="/jobs"
          className="mx-auto grid max-w-site gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(10,37,64,0.08)] lg:grid-cols-[1.5fr_1fr_1fr_0.9fr_auto]"
        >
          {minBudget !== null && <input type="hidden" name="minBudget" value={minBudget} />}
          {maxBudget !== null && <input type="hidden" name="maxBudget" value={maxBudget} />}
          <label className="relative block">
            <span className="sr-only">Search job title or keyword</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search job title or keyword"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="sr-only">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative block">
            <span className="sr-only">Location</span>
            <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-700" />
            <input
              type="text"
              name="location"
              defaultValue={location}
              placeholder="Manila, PH"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </label>
          <select
            aria-label="Search radius"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            defaultValue="25"
          >
            <option value="25">Within 25 km</option>
            <option value="10">Within 10 km</option>
            <option value="50">Within 50 km</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-7 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
          >
            Search Jobs
          </button>
        </form>
      </section>

      <section className="mx-auto flex max-w-site gap-6 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-extrabold text-[#0a2540]">
                <Filter className="h-4 w-4" />
                Filters
              </p>
              <Link href="/jobs" className="text-xs font-semibold text-slate-500 hover:text-brand-700">
                Clear all
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Categories</p>
              <div className="space-y-3">
                {categories.slice(0, 5).map((cat) => (
                  <Link
                    key={cat.name}
                    href={categoryUrl(search, location, minBudget, maxBudget, cat.name)}
                    className="flex items-center justify-between gap-3 text-sm text-slate-600 hover:text-brand-700"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded border ${category === cat.name ? "border-brand bg-brand" : "border-slate-300"}`} />
                      {cat.name}
                    </span>
                    <span className="text-xs text-slate-400">{cat.count.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
              <Link href="/jobs" className="mt-4 inline-flex text-xs font-bold text-brand-700">
                View more
              </Link>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Job Type</p>
              {["All Job Types", "One-time", "Recurring", "Part-time", "Full-time"].map((type, index) => (
                <div key={type} className="mb-3 flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className={`h-4 w-4 rounded border ${index === 0 ? "border-brand bg-brand" : "border-slate-300"}`} />
                    {type}
                  </span>
                  <span className="text-xs text-slate-400">{index === 0 ? total.toLocaleString() : Math.max(80, Math.round(activeJobs / (index + 2))).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Budget (PHP)</p>
              <form method="GET" action="/jobs">
                {search && <input type="hidden" name="q" value={search} />}
                {category && <input type="hidden" name="category" value={category} />}
                {location && <input type="hidden" name="location" value={location} />}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  name="minBudget"
                  defaultValue={minBudget ?? ""}
                  placeholder="Min"
                  className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400"
                />
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  name="maxBudget"
                  defaultValue={maxBudget ?? ""}
                  placeholder="Max"
                  className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <button
                type="submit"
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
              >
                Apply Budget
              </button>
              </form>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Posted</p>
              {["Anytime", "Last 24 hours", "Last 3 days", "Last 7 days"].map((item, index) => (
                <div key={item} className="mb-3 flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className={`h-4 w-4 rounded-full border ${index === 0 ? "border-brand bg-brand" : "border-slate-300"}`} />
                    {item}
                  </span>
                  {index > 0 && <span className="text-xs text-slate-400">{Math.max(24, Math.round(activeJobs / (index + 6))).toLocaleString()}</span>}
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Other Filters</p>
              <div className="space-y-3 text-sm text-slate-600">
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-slate-300" />Urgent Jobs</span>
                  <span className="text-xs text-slate-400">{urgentJobs}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-slate-300" />With Attachments</span>
                  <span className="text-xs text-slate-400">{Math.round(urgentJobs * 1.4)}</span>
                </p>
              </div>
              <Link
                href="/register?role=provider"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-300 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
              >
                <Bell className="h-4 w-4" />
                Save Search
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing {firstResult.toLocaleString()} - {lastResult.toLocaleString()} of {total.toLocaleString()} jobs
            </p>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
              <SlidersHorizontal className="h-4 w-4" />
              Sort by: Most Recent
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-400 shadow-card">
              <Briefcase className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-semibold text-slate-700">No open jobs found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              {jobs.map((job) => (
                <article
                  key={job._id}
                  className="group grid gap-4 border-b border-slate-100 p-5 last:border-b-0 sm:grid-cols-[64px_1fr_auto]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/jobs/${job._id}`} className="text-base font-extrabold text-[#0a2540] transition hover:text-brand-700">
                        {job.title}
                      </Link>
                      {Date.now() - new Date(job.createdAt).getTime() < 24 * 60 * 60_000 && (
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">
                          New
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      <span>{job.category || "General"}</span>
                      <span className="text-brand-700">One-time</span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {job.location || "Philippines"}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      {jobSummary(job)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-4 sm:items-end">
                    <div className="sm:text-right">
                      <p className="text-sm font-extrabold text-[#0a2540]">{formatPeso(job.budget)}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 sm:justify-end">
                        <Clock3 className="h-3.5 w-3.5" />
                        Posted {timeAgo(job.createdAt)}
                      </p>
                    </div>
                    <Link
                      href={`/jobs/${job._id}`}
                      className="inline-flex min-w-28 items-center justify-center rounded-lg border border-brand-300 px-4 py-2 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
                    >
                      View Job
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={pageUrl(page - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              )}
              {Array.from({ length: Math.min(3, totalPages) }).map((_, index) => {
                const p = index + 1;
                return (
                  <Link
                    key={p}
                    href={pageUrl(p)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                      page === p ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
              {totalPages > 4 && <span className="px-2 text-sm text-slate-400">...</span>}
              {totalPages > 3 && (
                <Link
                  href={pageUrl(totalPages)}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-bold ${
                    page === totalPages ? "bg-brand text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {totalPages}
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageUrl(page + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto flex max-w-site flex-col gap-6 rounded-3xl bg-gradient-to-r from-brand-50 via-white to-primary-50 p-7 shadow-[0_16px_55px_rgba(10,37,64,0.08)] sm:p-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100 sm:flex">
              <Bell className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a2540]">Get new jobs straight to you!</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Enable job alerts and be the first to apply for new opportunities that match your skills.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/register?role=provider"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Create Job Alert
            </Link>
            <Link
              href="/for-pros"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-bold text-brand-700 transition hover:text-brand-800"
            >
              Learn how job alerts work
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
