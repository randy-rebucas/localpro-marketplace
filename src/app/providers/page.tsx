import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ProviderProfile from "@/models/ProviderProfile";
import { Star, MapPin, Briefcase, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Browse Service Providers | LocalPro",
  description:
    "Hire KYC-verified local service professionals in the Philippines. Find plumbers, electricians, carpenters, cleaners, and more. View profiles, ratings, and hire securely.",
  openGraph: {
    title: "Find Trusted Service Providers | LocalPro",
    description:
      "Browse verified providers near you. Post a job or hire directly — payments protected by escrow.",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";
const PAGE_SIZE = 24;

interface ProviderCard {
  _id: string;
  name: string;
  avatar: string | null;
  bio: string;
  skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
  city: string;
  yearsExperience: number;
  hourlyRate: number | null;
  availabilityStatus: string;
}

async function getProviders(
  search: string,
  skill: string,
  page: number
): Promise<{ providers: ProviderCard[]; total: number; topSkills: string[] }> {
  try {
    await connectDB();

    // Build provider profile filter
    const profileFilter: Record<string, unknown> = {};
    if (skill) profileFilter["skills.skill"] = skill;

    const providersQuery = await ProviderProfile.find(profileFilter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({
        path: "userId",
        match: {
          role: "provider",
          approvalStatus: "approved",
          isSuspended: { $ne: true },
          isDeleted: { $ne: true },
          ...(search ? { name: { $regex: search, $options: "i" } } : {}),
        },
        select: "name avatar",
      })
      .select("_id userId bio skills yearsExperience hourlyRate availabilityStatus serviceAreas")
      .lean();

    // Filter out nulled userId (didn't match user filter)
    const valid = providersQuery.filter((p) => p.userId !== null);

    // Count total for pagination (approximate)
    const total = await ProviderProfile.countDocuments(profileFilter);

    const topSkills = (
      await ProviderProfile.aggregate([
        { $unwind: "$skills" },
        { $group: { _id: "$skills.skill", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
    ).map((s: { _id: string }) => s._id);

    const providers: ProviderCard[] = valid.map((p) => {
      const user = p.userId as { _id?: unknown; name?: string; avatar?: string | null } | null;
      const areas = (p as { serviceAreas?: { address?: string }[] }).serviceAreas;
      const skillsArray = Array.isArray(p.skills) ? (p.skills as unknown as Array<{ skill: string; yearsExperience: number; hourlyRate: string }>) : [];
      return {
        _id: String(user?._id ?? (p as { _id: unknown })._id),
        name: user?.name ?? "Provider",
        avatar: user?.avatar ?? null,
        bio: p.bio ?? "",
        skills: skillsArray,
        city: areas?.[0]?.address ?? "Philippines",
        yearsExperience: p.yearsExperience ?? 0,
        hourlyRate: p.hourlyRate ?? null,
        availabilityStatus: p.availabilityStatus ?? "available",
      };
    });

    return { providers: JSON.parse(JSON.stringify(providers)) as ProviderCard[], total, topSkills };
  } catch {
    return { providers: [], total: 0, topSkills: [] };
  }
}

export default async function PublicProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; skill?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() ?? "";
  const skill = sp.skill?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const { providers, total, topSkills } = await getProviders(search, skill, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (skill) params.set("skill", skill);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/providers${q ? `?${q}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home",             item: "https://www.localpro.asia" },
              { "@type": "ListItem", position: 2, name: "Browse Providers", item: "https://www.localpro.asia/providers" },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "LocalPro Service Providers",
            description: "Verified local service professionals in the Philippines",
            url: `${APP_URL}/providers`,
            numberOfItems: total,
          }),
        }}
      />

      {/* Header */}
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find Trusted Professionals
          </h1>
          <p className="text-slate-300 text-base sm:text-lg">
            {total.toLocaleString()} verified provider{total !== 1 ? "s" : ""} ready to help.
            All KYC-checked, rated, and escrow-protected.
          </p>
          <form method="GET" action="/providers" className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="Search by name…"
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

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-52 shrink-0 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Skill / Service
          </p>
          <Link
            href={`/providers${search ? `?q=${encodeURIComponent(search)}` : ""}`}
            className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
              !skill
                ? "bg-primary text-white font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Skills
          </Link>
          {topSkills.map((s) => (
            <Link
              key={s}
              href={`/providers?${new URLSearchParams({
                ...(search ? { q: search } : {}),
                skill: s,
              }).toString()}`}
              className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                skill === s
                  ? "bg-primary text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s}
            </Link>
          ))}
        </aside>

        {/* Provider grid */}
        <div className="flex-1 min-w-0">
          {providers.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No providers found</p>
              <p className="text-sm mt-1">Try a different search or skill</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((p) => (
                <Link
                  key={p._id}
                  href={`/providers/${p._id}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.city}</span>
                      </div>
                    </div>
                    {p.availabilityStatus === "available" && (
                      <span className="ml-auto shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </span>
                    )}
                  </div>

                  {p.bio && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {p.bio}
                    </p>
                  )}

                  {p.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 3).map((sk) => (
                        <span
                          key={sk.skill}
                          className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                        >
                          {sk.skill}
                        </span>
                      ))}
                      {p.skills.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          +{p.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    {p.yearsExperience > 0 && (
                      <span className="text-xs text-slate-500">
                        {p.yearsExperience}yr{p.yearsExperience !== 1 ? "s" : ""} exp
                      </span>
                    )}
                    {p.hourlyRate && (
                      <span className="text-xs font-bold text-primary">
                        ₱{p.hourlyRate.toLocaleString("en-PH")}/hr
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs text-primary font-semibold group-hover:gap-2 transition-all">
                      View Profile <ArrowRight className="h-3.5 w-3.5" />
                    </span>
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
          <h2 className="text-2xl font-bold">Need a service done?</h2>
          <p className="text-blue-100">
            Post your job for free. Get quotes from verified providers in minutes. Pay only when you&apos;re satisfied — protected by escrow.
          </p>
          <Link
            href="/register?role=client"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors"
          >
            Post a Job Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
