import { redirect } from "next/navigation";
import Script from "next/script";
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
import HeroIllustration from "@/components/homepage/HeroIllustration";
import { PostJobIllustration, GetQuotesIllustration, PaySafelyIllustration } from "@/components/homepage/StepIllustrations";

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
          className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-card-hover transition-all text-center ${i < 2 ? "p-8 sm:row-span-2" : "p-4"
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
    .limit(8)
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
            className={`group rounded-2xl border transition-all p-5 flex flex-col gap-3 hover:-translate-y-0.5 ${isFeatured
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
                  className={`bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col gap-3 hover:border-slate-700 transition-all ${isFeatured ? "border-l-4 border-l-amber-400" : ""
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
    <div className="relative -mt-10 z-10 max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { value: displayCount, label: "Jobs completed", icon: <TrendingUp className="h-5 w-5 text-primary" />, accent: "border-t-primary" },
          { value: "500+", label: "Verified providers", icon: <Users className="h-5 w-5 text-brand" />, accent: "border-t-brand" },
          { value: "4.8", label: "Average rating", icon: <Star className="h-5 w-5 fill-amber-400 text-amber-400" />, accent: "border-t-amber-400" },
        ].map((s) => (
          <div key={s.label} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 border-t-[3px] ${s.accent} p-4 sm:p-6 text-center`}>
            <div className="flex justify-center mb-2">{s.icon}</div>
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
  const cats = await Category.find().sort({ order: 1 }).limit(14).lean();
  const categories = cats.map((cat) => {
    const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
    return { id: String(c._id), name: c.name, icon: c.icon, slug: c.slug };
  });

  const jobs = await Job.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(8)
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
            className={`group rounded-2xl border transition-all p-5 flex flex-col gap-3 hover:-translate-y-0.5 ${isFeatured
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
          className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-card-hover transition-all text-center ${i < 2 ? "p-8 sm:row-span-2" : "p-4"
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
      client: "/client/dashboard",
      provider: "/provider/dashboard",
      admin: "/admin/dashboard",
    };
    redirect(routes[user.role] ?? "/login");
  }

  // Fetch categories for hero search (lightweight, needed immediately)
  const heroCategories = await HeroCategoriesData();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950" suppressHydrationWarning>
      {/* JSON-LD: Organization + WebSite + FAQ structured data */}
      <Script
        type="application/ld+json"
        strategy="afterInteractive"
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

      {/* ── Hero — asymmetric layout with illustration + search ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pt-16 sm:pt-20 px-4">
        {/* Subtle geometric accents */}
        <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04]">
          <svg viewBox="0 0 600 600" fill="none"><circle cx="300" cy="300" r="280" stroke="#1a5fa8" strokeWidth="1" /><circle cx="300" cy="300" r="200" stroke="#1a5fa8" strokeWidth="0.5" /><circle cx="300" cy="300" r="120" stroke="#3ea53e" strokeWidth="0.5" /></svg>
        </div>

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.08] tracking-tight mb-5">
              Hire{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Trusted Local</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-brand/15 dark:bg-brand/20 rounded-sm -z-0" />
              </span>{" "}
              <br className="hidden sm:block" />
              Service Pros
            </h1>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-lg leading-relaxed mx-auto lg:mx-0">
              Post a job, receive quotes from verified providers, and pay with full escrow protection. Plumbing, electrical, cleaning &mdash; and{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">50+ service categories</span>.
            </p>

            {/* Search bar — primary interaction */}
            <div className="mb-6 max-w-md mx-auto lg:mx-0">
              <ServiceSearch categories={heroCategories} />
            </div>

            {/* Quick category pills */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start max-w-md mx-auto lg:mx-0 mb-6">
              {heroCategories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/register?role=client&category=${cat.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 transition-colors shadow-sm"
                >
                  <span>{cat.icon}</span> {cat.name}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-brand" /> Free to post</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Escrow protection</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-brand" /> 500+ verified providers</span>
            </div>
          </div>

          {/* Right: illustration + floating cards */}
          <div className="relative hidden lg:flex items-center justify-center">
            <HeroIllustration className="w-full max-w-[420px] h-auto drop-shadow-sm" />
            {/* Floating mini-card: recent completion */}
            <div className="absolute -bottom-2 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Job Completed</p>
                <p className="text-[10px] text-slate-400">Plumbing repair &middot; 2h ago</p>
              </div>
            </div>
            {/* Floating mini-card: rating */}
            <div className="absolute top-4 -right-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-2.5 animate-fade-in">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">5.0</span>
            </div>
          </div>
        </div>

        {/* Provider CTA — subtle, below the fold */}
        <div className="max-w-6xl mx-auto mt-10 text-center lg:text-left">
          <p className="text-xs text-slate-400">
            Are you a service provider?{" "}
            <Link href="/register?role=provider" className="text-primary hover:underline font-medium">
              Join LocalPro <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </div>
      </section>

      {/* ── Chrome Extension Promotion ── */}
      <ScrollReveal>
        <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-slate-900 dark:to-indigo-950/30 rounded-3xl border border-slate-200 dark:border-slate-700 px-6 sm:px-10 py-8 sm:py-10">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-200/20 dark:bg-blue-500/5 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-indigo-200/20 dark:bg-indigo-500/5 blur-2xl" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-700/30 flex items-center justify-center shrink-0">
                  <span className="text-3xl">🔔</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">LocalPro Companion Chrome Extension</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Get real-time notifications, quick job posting, and priority alerts directly in your browser.</p>
                </div>
              </div>
              <Link
                href="https://chromewebstore.google.com/detail/localpro-companion/lkbgkaaoaiikeefgfddlblhfmkccejia?authuser=0&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm px-6 py-2.5 rounded-xl shadow-sm shrink-0"
              >
                Install now <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Stats — floating overlap cards ── */}
      <Suspense fallback={<div className="h-20" />}>
        <StatsStrip />
      </Suspense>

      {/* ── Marketplace Tabs (Jobs + Categories merged) ── */}
      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceTabsSection />
      </Suspense>

      {/* ── Testimonials ── */}
      <ScrollReveal>
        <section className="bg-slate-50 dark:bg-slate-900 py-16 sm:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] text-center mb-10">What people are saying</p>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Testimonial 1 — client */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-card flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <blockquote className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed mb-6 flex-1">
                  &ldquo;LocalPro made it so easy to find a reliable electrician. The escrow protection gave me complete peace of mind &mdash; I knew my money was safe until the job was done right.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-brand/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">MS</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Maria Santos</p>
                    <p className="text-xs text-slate-400">Homeowner &middot; Ormoc City</p>
                  </div>
                </div>
              </div>
              {/* Testimonial 2 — provider */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-card flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <blockquote className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed mb-6 flex-1">
                  &ldquo;Since joining LocalPro, I&apos;ve doubled my monthly clients. The platform handles payments automatically and clients trust me more with the verified badge. Best decision I made.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand/20 to-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand">JR</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Juan Reyes</p>
                    <p className="text-xs text-slate-400">Electrician &middot; Gold-tier Provider</p>
                  </div>
                </div>
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
              <p className="text-[11px] text-primary font-semibold uppercase tracking-[0.2em] mb-3">How it works</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">Three steps to get the job done</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">Post, compare, and pay safely &mdash; all in one place.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden sm:block absolute top-[88px] left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-primary/15 via-primary/30 to-primary/15" />

              {[
                {
                  illustration: <PostJobIllustration className="w-24 h-24" />,
                  title: "Post a Job",
                  desc: "Describe what you need, set your budget, and pick a schedule. Takes under 2 minutes.",
                  trust: "Free to post — no hidden fees",
                  trustIcon: <CheckCircle className="h-3.5 w-3.5 text-brand" />,
                  num: "01",
                },
                {
                  illustration: <GetQuotesIllustration className="w-24 h-24" />,
                  title: "Get Quotes",
                  desc: "Receive competitive quotes from verified, rated providers &mdash; usually within hours.",
                  trust: "KYC-verified providers only",
                  trustIcon: <Shield className="h-3.5 w-3.5 text-primary" />,
                  num: "02",
                },
                {
                  illustration: <PaySafelyIllustration className="w-24 h-24" />,
                  title: "Pay Safely",
                  desc: "Funds are held in escrow and only released after you approve the completed work.",
                  trust: "Full escrow protection",
                  trustIcon: <Lock className="h-3.5 w-3.5 text-brand" />,
                  num: "03",
                },
              ].map((step) => (
                <div key={step.title} className="relative bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 flex flex-col gap-4 group hover:shadow-card-hover transition-shadow">
                  {/* Watermark number */}
                  <span className="absolute top-4 right-6 text-6xl font-extrabold text-slate-100 dark:text-slate-800 select-none pointer-events-none">{step.num}</span>
                  {/* Illustration */}
                  <div className="relative flex justify-center sm:justify-start mb-2 group-hover:scale-[1.03] transition-transform">
                    {step.illustration}
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-slate-200 dark:border-slate-700">
                    {step.trustIcon}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{step.trust}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Provider promotion strip ── */}
      <ScrollReveal>
        <section className="max-w-5xl mx-auto px-4 pb-12 sm:pb-16">
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-50 via-white to-amber-50 dark:from-violet-950/30 dark:via-slate-900 dark:to-amber-950/30 rounded-3xl border border-slate-200 dark:border-slate-700 px-6 sm:px-10 py-8 sm:py-10">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-200/20 dark:bg-amber-500/5 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-200/20 dark:bg-violet-500/5 blur-2xl" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-violet-100 dark:from-amber-900/30 dark:to-violet-900/30 border border-amber-200/60 dark:border-amber-700/30 flex items-center justify-center shrink-0">
                  <span className="text-3xl">&#x1F3C6;</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">Grow your business with LocalPro</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Earn badges, lower your commission from 15% to 6%, and unlock premium client access as you level up.</p>
                </div>
              </div>
              <Link
                href="/register?role=provider"
                className="btn-primary text-sm px-6 py-2.5 rounded-xl shadow-sm shrink-0"
              >
                Start as a provider <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Partners & Trust ── */}
      <section className="py-10 sm:py-14 px-4 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em] text-center mb-8">Official partners &amp; recognitions</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {/* Ormoc LGU */}
            <div className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-2 group-hover:shadow-card-hover transition-shadow">
                <Image
                  src="/official_seal_ormoc.png"
                  alt="Ormoc City official seal"
                  className="w-full h-full object-contain"
                  width={56}
                  height={56}
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">Ormoc City LGU</p>
                <p className="text-[10px] text-slate-400">Official Government Partner</p>
              </div>
            </div>
            {/* PESO badge */}
            <div className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center group-hover:shadow-card-hover transition-shadow">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">PESO Ormoc</p>
                <p className="text-[10px] text-slate-400">Employment Partnership</p>
              </div>
            </div>
            {/* Security badge */}
            <div className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center group-hover:shadow-card-hover transition-shadow">
                <Shield className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">Escrow Protected</p>
                <p className="text-[10px] text-slate-400">Secure payments</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <ScrollReveal>
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-700 to-primary-900 py-20 sm:py-28 px-4">
          {/* Subtle dot pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          {/* Accent glow */}
          <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

          <div className="relative max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
              Ready to get started?
            </h2>
            <p className="text-white/65 mb-10 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Join thousands of clients and providers on LocalPro. Post your first job completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register?role=client"
                className="bg-white text-primary font-semibold text-sm sm:text-base px-8 py-3.5 rounded-xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-lg inline-flex items-center justify-center gap-2"
              >
                I need a service <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register?role=provider"
                className="bg-white/10 border border-white/25 text-white font-semibold text-sm sm:text-base px-8 py-3.5 rounded-xl hover:bg-white/20 hover:-translate-y-0.5 transition-all backdrop-blur-sm inline-flex items-center justify-center"
              >
                I offer services
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Footer ── */}
      <PublicFooter />
    </div>
  );
}
