import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import ProviderProfile from "@/models/ProviderProfile";
import Review from "@/models/Review";
import Job from "@/models/Job";
import "@/models/User";
import FeaturedListing from "@/models/FeaturedListing";
import Link from "next/link";
import { CheckCircle, Briefcase, Star, Shield, ArrowRight, MapPin, Users, TrendingUp, Lock, Zap } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { formatRelativeTime, formatPHP } from "@/lib/utils";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import ScrollReveal from "@/components/homepage/ScrollReveal";
import ServiceSearch from "@/components/homepage/ServiceSearch";
import MarketplaceTabs from "@/components/homepage/MarketplaceTabs";

// ── Async data sections (deferred behind Suspense) ────────────────────────────

async function CategoriesData() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  if (!cats.length) return null;

  const categories = cats.map((cat) => {
    const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
    return { id: String(c._id), name: c.name, icon: c.icon, slug: c.slug };
  });

  // Bento grid: first 2 are large, rest are small
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((c, i) => (
        <Link
          key={c.id}
          href={`/register?role=client&category=${c.slug}`}
          className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-card-hover transition-all text-center ${
            i < 2 ? "p-8 sm:row-span-2" : "p-4"
          }`}
        >
          <span className={`group-hover:scale-110 transition-transform ${i < 2 ? "text-4xl" : "text-2xl"}`}>{c.icon}</span>
          <span className={`font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors leading-tight ${i < 2 ? "text-sm" : "text-xs"}`}>
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

async function LatestJobsData() {
  await connectDB();
  const jobs = await Job.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(6)
    .select("title category location budget scheduleDate createdAt")
    .lean();

  if (!jobs.length) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((j, i) => {
        const job = j as unknown as { _id: string; title: string; category: string; location: string; budget: number; scheduleDate: Date; createdAt: Date };
        const isFeatured = i === 0;
        return (
          <Link
            key={String(job._id)}
            href={`/jobs/${job._id}`}
            className={`group rounded-2xl border transition-all p-5 flex flex-col gap-3 hover:-translate-y-0.5 ${
              isFeatured
                ? "sm:col-span-2 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/30 dark:to-slate-800 border-primary/20 shadow-md hover:shadow-lg"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 mb-1">{job.category}</p>
                <h3 className={`font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 ${isFeatured ? "text-base" : "text-sm"}`}>
                  {job.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />{job.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="font-medium text-slate-700 dark:text-slate-200">{formatPHP(job.budget)}</span></span>
            </div>
            <p className="text-[10px] text-slate-400 mt-auto">Posted {formatRelativeTime(job.createdAt)}</p>
          </Link>
        );
      })}
    </div>
  );
}

async function MarketplaceSection() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  const categories = cats.map((cat) => {
    const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
    return { id: String(c._id), name: c.name, icon: c.icon, slug: c.slug };
  });

  return { categories };
}

async function HeroCategoriesData() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  return cats.map((cat) => {
    const c = cat as unknown as { name: string; icon: string; slug: string };
    return { name: c.name, icon: c.icon, slug: c.slug };
  });
}

async function TopProvidersSection() {
  await connectDB();
  const [topProviders, availableCount, lastJob, activeListings] = await Promise.all([
    ProviderProfile.find({ availabilityStatus: "available" })
      .sort({ avgRating: -1, completedJobCount: -1 })
      .limit(6)
      .populate("userId", "name isVerified avatar")
      .lean(),
    ProviderProfile.countDocuments({ availabilityStatus: "available" }),
    Job.findOne({ status: { $in: ["completed", "in_progress", "accepted"] } })
      .sort({ updatedAt: -1 })
      .select("updatedAt")
      .lean(),
    FeaturedListing.find({
      type: "homepage_highlight",
      status: "active",
      expiresAt: { $gt: new Date() },
    }).select("providerId").lean(),
  ]);

  if (!topProviders.length) return null;

  // Build set of featured provider IDs
  const featuredIds = new Set(
    activeListings.map((l) => String((l as unknown as { providerId: string }).providerId)),
  );

  const providerIds = topProviders
    .filter((p) => p.userId != null)
    .map((p) => {
      const uid = p.userId as unknown as { _id: string } | string;
      return typeof uid === "string" ? uid : uid._id;
    });
  const reviewCounts = await Review.aggregate([
    { $match: { providerId: { $in: providerIds } } },
    { $group: { _id: "$providerId", count: { $sum: 1 } } },
  ]);
  const countMap: Record<string, number> = {};
  for (const r of reviewCounts) countMap[String(r._id)] = r.count;

  return (
    <section className="bg-slate-950 py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Top-Rated Providers</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <strong>{availableCount}</strong> available now
                </span>
                {lastJob && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Last booking {formatRelativeTime((lastJob as unknown as { updatedAt: Date }).updatedAt)}
                  </span>
                )}
              </div>
            </div>
            <Link href="/providers" className="text-sm font-medium text-primary-300 hover:text-primary-200 transition-colors hidden sm:block shrink-0">
              Browse all providers &rarr;
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal stagger>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topProviders.filter((p) => p.userId != null).map((p) => {
              const profile = p as unknown as {
                _id: string;
                userId: { _id: string; name: string; isVerified: boolean; avatar?: string | null };
                bio: string;
                avgRating: number;
                completedJobCount: number;
                completionRate: number;
                avgResponseTimeHours: number;
                skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
                hourlyRate?: number;
                isLocalProCertified?: boolean;
              };
              const initials = profile.userId?.name
                ?.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
              const reviews = countMap[String(profile.userId?._id)] ?? 0;
              const isTopRated = profile.avgRating >= 4.5 && profile.completedJobCount >= 10;
              const isFastResponder = profile.avgResponseTimeHours > 0 && profile.avgResponseTimeHours <= 2;
              const isFeatured = featuredIds.has(String(profile.userId?._id));

              return (
                <div
                  key={String(profile._id)}
                  className={`bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col gap-3 hover:border-slate-700 transition-all ${
                    isFeatured ? "border-l-4 border-l-amber-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border border-slate-700">
                      {profile.userId?.avatar ? (
                        <Image
                          src={profile.userId.avatar}
                          alt={profile.userId.name ?? "Provider"}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-300">{initials}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-white text-sm truncate">{profile.userId?.name}</p>
                        {profile.userId?.isVerified && (
                          <CheckCircle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        )}
                        {isFeatured && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full ml-1">Featured</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-300">{profile.completedJobCount}</span> jobs &middot;{" "}
                        <span className="font-medium text-slate-300">{reviews}</span> review{reviews !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">
                        {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : "New"}
                      </span>
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{profile.bio}</p>
                  )}
                  {(isTopRated || isFastResponder || profile.isLocalProCertified) && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.isLocalProCertified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          LocalPro Certified
                        </span>
                      )}
                      {isTopRated && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Top Rated
                        </span>
                      )}
                      {isFastResponder && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Fast Responder
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    {profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.slice(0, 2).map((s) => (
                          <span key={s.skill} className="badge bg-slate-800 text-slate-400 text-xs">{s.skill}</span>
                        ))}
                        {profile.skills.length > 2 && (
                          <span className="badge bg-slate-800 text-slate-500 text-xs">+{profile.skills.length - 2}</span>
                        )}
                      </div>
                    )}
                    {profile.hourlyRate != null && (
                      <p className="text-xs text-slate-500 shrink-0 ml-auto">
                        from <span className="font-semibold text-slate-300">&peso;{profile.hourlyRate.toLocaleString()}/hr</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function MarketplaceSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
      <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-8" />
      <div className="h-10 w-72 bg-slate-100 dark:bg-slate-800 rounded-xl mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
        ))}
      </div>
    </section>
  );
}

function TopProvidersSkeleton() {
  return (
    <section className="bg-slate-950 py-16 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-56 bg-slate-800 rounded-lg mb-10" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    </section>
  );
}

async function StatsStrip() {
  await connectDB();
  const completedCount = await Job.countDocuments({ status: "completed" });
  const displayCount =
    completedCount >= 10000
      ? `${Math.floor(completedCount / 1000)}K+`
      : completedCount >= 1000
      ? `${(completedCount / 1000).toFixed(1).replace(".0", "")}K+`
      : completedCount > 0
      ? `${completedCount}+`
      : "500+";

  return (
    <div className="relative -mt-8 z-10 max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { value: displayCount, label: "Jobs completed" },
          { value: "500+", label: "Verified providers" },
          { value: "4.8", label: "Average rating" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-4 sm:p-6 text-center">
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Combined marketplace section ──────────────────────────────────────────────

async function MarketplaceTabsSection() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  const categories = cats.map((cat) => {
    const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
    return { id: String(c._id), name: c.name, icon: c.icon, slug: c.slug };
  });

  const jobs = await Job.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(6)
    .select("title category location budget scheduleDate createdAt")
    .lean();

  const jobCards = jobs.length > 0 ? (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((j, i) => {
        const job = j as unknown as { _id: string; title: string; category: string; location: string; budget: number; createdAt: Date };
        const isFeatured = i === 0;
        return (
          <Link
            key={String(job._id)}
            href={`/jobs/${job._id}`}
            className={`group rounded-2xl border transition-all p-5 flex flex-col gap-3 hover:-translate-y-0.5 ${
              isFeatured
                ? "sm:col-span-2 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/30 dark:to-slate-800 border-primary/20 shadow-md hover:shadow-lg"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 mb-1">{job.category}</p>
                <h3 className={`font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 ${isFeatured ? "text-base" : "text-sm"}`}>
                  {job.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open
              </span>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />{job.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span className="font-medium text-slate-700 dark:text-slate-200">{formatPHP(job.budget)}</span></span>
            </div>
            <p className="text-[10px] text-slate-400 mt-auto">Posted {formatRelativeTime(job.createdAt)}</p>
          </Link>
        );
      })}
    </div>
  ) : (
    <p className="text-slate-400 text-sm">No open jobs right now. Check back soon!</p>
  );

  const categoryCards = categories.length > 0 ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((c, i) => (
        <Link
          key={c.id}
          href={`/register?role=client&category=${c.slug}`}
          className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-card-hover transition-all text-center ${
            i < 2 ? "p-8 sm:row-span-2" : "p-4"
          }`}
        >
          <span className={`group-hover:scale-110 transition-transform ${i < 2 ? "text-4xl" : "text-2xl"}`}>{c.icon}</span>
          <span className={`font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors leading-tight ${i < 2 ? "text-sm" : "text-xs"}`}>
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  ) : null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
      <ScrollReveal>
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Explore the Marketplace</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Real jobs from real clients. Find your next opportunity or the right pro.</p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <MarketplaceTabs
          jobsContent={jobCards}
          categoriesContent={categoryCards}
        />
      </ScrollReveal>

      <div className="mt-6 flex gap-4">
        <Link href="/jobs" className="text-sm font-medium text-primary hover:underline">Browse all jobs &rarr;</Link>
        <Link href="/providers" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline">View all providers &rarr;</Link>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user) {
    const routes: Record<string, string> = {
      client:   "/client/dashboard",
      provider: "/provider/dashboard",
      admin:    "/admin/dashboard",
    };
    redirect(routes[user.role] ?? "/login");
  }

  // Fetch categories for hero search (lightweight, needed immediately)
  const heroCategories = await HeroCategoriesData();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* JSON-LD: Organization + WebSite + FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "LocalPro",
              url: "https://www.localpro.asia",
              logo: "https://www.localpro.asia/logo.jpg",
              description: "The Philippines\u2019 trusted marketplace for local service professionals.",
              foundingDate: "2024",
              areaServed: { "@type": "Country", name: "Philippines" },
              address: {
                "@type": "PostalAddress",
                addressLocality: "Ormoc City",
                addressRegion: "Leyte",
                addressCountry: "PH",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@localpro.asia",
                availableLanguage: ["English", "Filipino"],
              },
              sameAs: [
                "https://www.facebook.com/localproasia",
                "https://www.linkedin.com/company/localproasia",
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LocalPro",
              url: "https://www.localpro.asia",
              description: "Find and hire trusted local service professionals in the Philippines.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.localpro.asia/jobs?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is LocalPro?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "LocalPro is a Philippine-based marketplace that connects clients with verified local service professionals such as plumbers, electricians, carpenters, cleaners, and more. Payments are protected by escrow.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do I hire a service provider on LocalPro?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Simply post a job with your requirements and budget. Verified providers will send you quotes. You choose the best match, then pay securely through LocalPro\u2019s escrow \u2014 funds are only released once you approve the completed work.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is LocalPro free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, posting a job on LocalPro is completely free. Clients pay no platform fees. Service providers pay a small commission only when they complete a job.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Are providers on LocalPro verified?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Every service provider on LocalPro goes through identity and background verification (KYC) before they can accept jobs. Providers also accumulate reviews and ratings from real clients.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What services can I find on LocalPro?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "LocalPro covers a wide range of local services including plumbing, electrical work, carpentry, painting, cleaning, aircon repair, landscaping, construction, and many more.",
                  },
                },
              ],
            },
          ]),
        }}
      />

      {/* ── Nav ── */}
      <PublicHeader />

      {/* ── Hero — asymmetric layout with search ── */}
      <section className="bg-white dark:bg-slate-950 pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Trusted by Filipinos across the country
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.08] tracking-tight mb-5">
              Hire{" "}
              <span className="decoration-brand decoration-[3px] underline underline-offset-[6px]">
                Trusted Local
              </span>{" "}
              Pros
            </h1>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-lg leading-relaxed mx-auto lg:mx-0">
              Post a job, receive quotes from verified providers, and pay with full escrow protection. Plumbing, electrical, cleaning, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <Link
                href="/register?role=client"
                className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Post a Job &mdash; It&apos;s Free
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-brand" /> Free to post</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Escrow protection</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-brand" /> 500+ verified providers</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Are you a service provider?{" "}
              <Link href="/register?role=provider" className="text-primary hover:underline font-medium">
                Join LocalPro <ArrowRight className="inline h-3 w-3" />
              </Link>
            </p>
          </div>

          {/* Right: search */}
          <div className="flex flex-col items-center lg:items-start gap-6">
            <div className="w-full max-w-md">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center lg:text-left">What do you need help with?</p>
              <ServiceSearch categories={heroCategories} />
            </div>
            {/* Quick category pills */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start max-w-md">
              {heroCategories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/register?role=client&category=${cat.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full px-3 py-1.5 transition-colors"
                >
                  <span>{cat.icon}</span> {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats — floating overlap cards ── */}
      <Suspense fallback={<div className="h-20" />}>
        <StatsStrip />
      </Suspense>

      {/* ── Marketplace Tabs (Jobs + Categories merged) ── */}
      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceTabsSection />
      </Suspense>

      {/* ── Testimonial ── */}
      <ScrollReveal>
        <section className="bg-slate-50 dark:bg-slate-900 py-16 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-5xl sm:text-6xl text-primary/15 font-serif leading-none mb-4">&ldquo;</p>
            <blockquote className="text-lg sm:text-2xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic mb-6">
              LocalPro made it so easy to find a reliable electrician. The escrow protection gave me complete peace of mind &mdash; I knew my money was safe until the job was done right.
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-brand/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">MS</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Maria Santos</p>
                <p className="text-xs text-slate-400">Homeowner, Ormoc City</p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Top Providers — dark section ── */}
      <Suspense fallback={<TopProvidersSkeleton />}>
        <TopProvidersSection />
      </Suspense>

      {/* ── How It Works + Why LocalPro (merged) ── */}
      <ScrollReveal>
        <section className="bg-white dark:bg-slate-950 py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">How LocalPro Works</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">Three simple steps to get the job done safely.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden sm:block absolute top-12 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

              {[
                {
                  icon: <Briefcase className="h-6 w-6 text-primary" />,
                  title: "Post a Job",
                  desc: "Describe what you need, set your budget, and pick a schedule.",
                  trust: "Free to post",
                  trustIcon: <CheckCircle className="h-3.5 w-3.5 text-brand" />,
                  num: "01",
                },
                {
                  icon: <Star className="h-6 w-6 text-primary" />,
                  title: "Get Quotes",
                  desc: "Receive competitive quotes from verified, rated providers — usually within hours.",
                  trust: "KYC-verified providers",
                  trustIcon: <Shield className="h-3.5 w-3.5 text-primary" />,
                  num: "02",
                },
                {
                  icon: <Shield className="h-6 w-6 text-primary" />,
                  title: "Pay Safely",
                  desc: "Funds are held in escrow and only released after you approve the completed work.",
                  trust: "Full escrow protection",
                  trustIcon: <Lock className="h-3.5 w-3.5 text-brand" />,
                  num: "03",
                },
              ].map((step) => (
                <div key={step.title} className="relative bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 flex flex-col gap-4">
                  {/* Watermark number */}
                  <span className="absolute top-4 right-6 text-6xl font-extrabold text-slate-100 dark:text-slate-800 select-none pointer-events-none">{step.num}</span>
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-200 dark:border-slate-700">
                    {step.trustIcon}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{step.trust}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Provider promotion strip (replaces full tiers section) ── */}
      <ScrollReveal>
        <section className="max-w-5xl mx-auto px-4 pb-12 sm:pb-16">
          <div className="bg-gradient-to-r from-violet-50 to-amber-50 dark:from-violet-950/30 dark:to-amber-950/30 rounded-2xl border border-slate-200 dark:border-slate-700 px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">&#x1F3C6;</span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Grow your business with LocalPro</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Earn badges, lower commission fees, and unlock premium client access.</p>
              </div>
            </div>
            <Link
              href="/register?role=provider"
              className="btn-primary text-sm px-5 py-2 rounded-xl shadow-sm shrink-0"
            >
              Start as a provider <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Partners — minimal trust strip ── */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-6">
          <p className="text-[11px] text-slate-400 uppercase tracking-[0.15em]">Trusted by</p>
          <div className="flex items-center gap-3 group">
            <div className="w-[52px] h-[52px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-1.5">
              <Image
                src="/official_seal_ormoc.png"
                alt="Ormoc City official seal"
                className="w-full h-full object-contain"
                width={52}
                height={52}
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">Ormoc City LGU</p>
              <p className="text-[10px] text-slate-400">Official Partner</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-primary py-20 sm:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
            Ready to get started?
          </h2>
          <p className="text-white/70 mb-10 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Join thousands of clients and providers on LocalPro. Post your first job completely free.
          </p>
          <Link
            href="/register?role=client"
            className="bg-white text-primary font-semibold text-sm sm:text-base px-8 py-3.5 rounded-xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-md inline-block"
          >
            I need a service
          </Link>
          <p className="mt-5 text-xs text-white/50">
            Offer services?{" "}
            <Link href="/register?role=provider" className="text-white/80 hover:text-white underline">
              Join as a provider
            </Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter />
    </div>
  );
}
