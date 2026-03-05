import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import ProviderProfile from "@/models/ProviderProfile";
import Review from "@/models/Review";
import Job from "@/models/Job";
import "@/models/User";
import Link from "next/link";
import { CheckCircle, Briefcase, Star, Shield, ArrowRight, MapPin, Users, TrendingUp, Lock, Zap } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/utils";

// ── Async data sections (deferred behind Suspense) ────────────────────────────

async function CategoriesSection() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  if (!cats.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Browse by Service</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">Whatever you need done, we&apos;ve got a pro for it.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {cats.map((cat) => {
          const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
          return (
            <Link
              key={String(c._id)}
              href={`/register?role=client&category=${c.slug}`}
              className="group flex flex-col items-center gap-2 sm:gap-2.5 p-3.5 sm:p-5 rounded-2xl border border-slate-200 hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all bg-white text-center"
            >
              <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{c.icon}</span>
              <span className="text-xs font-medium text-slate-600 group-hover:text-primary transition-colors leading-tight">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function TopProvidersSection() {
  await connectDB();
  const [topProviders, availableCount, lastJob] = await Promise.all([
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
  ]);

  if (!topProviders.length) return null;

  const providerIds = topProviders.map((p) => {
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
    <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
      <div className="flex items-end justify-between mb-8 sm:mb-10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Top-Rated Providers</h2>
          <p className="text-slate-500 text-sm">Ready to take on your next job.</p>
        </div>
        <Link href="/register?role=client" className="text-sm font-medium text-primary hover:underline hidden sm:block shrink-0">
          Find more providers →
        </Link>
      </div>

      {/* Liquidity signals */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <strong>{availableCount}</strong> providers available now
        </span>
        {lastJob && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Last booking{" "}
            {formatRelativeTime((lastJob as unknown as { updatedAt: Date }).updatedAt)}
          </span>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {topProviders.map((p) => {
          const profile = p as unknown as {
            _id: string;
            userId: { _id: string; name: string; isVerified: boolean; avatar?: string | null };
            bio: string;
            avgRating: number;
            completedJobCount: number;
            completionRate: number;
            avgResponseTimeHours: number;
            skills: string[];
            hourlyRate?: number;
            isLocalProCertified?: boolean;
          };
          const initials = profile.userId?.name
            ?.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
          const reviews = countMap[String(profile.userId?._id)] ?? 0;
          const isTopRated = profile.avgRating >= 4.5 && profile.completedJobCount >= 10;
          const isFastResponder = profile.avgResponseTimeHours > 0 && profile.avgResponseTimeHours <= 2;

          return (
            <div
              key={String(profile._id)}
              className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border border-primary/15">
                  {profile.userId?.avatar ? (
                    <Image
                      src={profile.userId.avatar}
                      alt={profile.userId.name ?? "Provider"}
                      width={48}
                      height={48}
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-slate-900 text-sm truncate">{profile.userId?.name}</p>
                    {profile.userId?.isVerified && (
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium text-slate-700">{profile.completedJobCount}</span> jobs ·{" "}
                    <span className="font-medium text-slate-700">{reviews}</span> review{reviews !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700">
                    {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : "New"}
                  </span>
                </div>
              </div>
              {profile.bio && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{profile.bio}</p>
              )}
              {/* Smart tags */}
              {(isTopRated || isFastResponder || profile.isLocalProCertified) && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.isLocalProCertified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      🎖️ LocalPro Certified
                    </span>
                  )}
                  {isTopRated && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⭐ Top Rated
                    </span>
                  )}
                  {isFastResponder && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      ⚡ Fast Responder
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 2).map((s) => (
                      <span key={s} className="badge bg-slate-100 text-slate-600 text-xs">{s}</span>
                    ))}
                    {profile.skills.length > 2 && (
                      <span className="badge bg-slate-100 text-slate-400 text-xs">+{profile.skills.length - 2}</span>
                    )}
                  </div>
                )}
                {profile.hourlyRate != null && (
                  <p className="text-xs text-slate-400 shrink-0 ml-auto">
                    from <span className="font-semibold text-slate-700">₱{profile.hourlyRate.toLocaleString()}/hr</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function CategoriesSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 animate-pulse">
      <div className="text-center mb-8 sm:mb-12">
        <div className="h-8 w-52 bg-slate-200 rounded-lg mx-auto mb-3" />
        <div className="h-4 w-72 bg-slate-100 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 border border-slate-200" />
        ))}
      </div>
    </section>
  );
}

function TopProvidersSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20 animate-pulse">
      <div className="h-8 w-56 bg-slate-200 rounded-lg mb-8 sm:mb-10" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-slate-100 border border-slate-200" />
        ))}
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
    <section className="border-y border-slate-100 bg-slate-50/70 py-8 px-4">
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 sm:gap-6 text-center">
        {[
          { icon: <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />, value: displayCount, label: "Jobs completed" },
          { icon: <Users      className="h-5 w-5 text-brand mx-auto mb-1" />,   value: "500+",       label: "Verified providers" },
          { icon: <Star       className="h-5 w-5 text-amber-400 fill-amber-400 mx-auto mb-1" />, value: "4.8", label: "Average rating" },
        ].map((s) => (
          <div key={s.label}>
            {s.icon}
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
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

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs leading-none">LP</span>
            </div>
            <span className="text-lg font-bold">
              <span className="text-primary">Local</span><span className="text-brand">Pro</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login"    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">Log in</Link>
            <Link href="/register" className="btn-primary text-sm shadow-sm">Get started →</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero — no data dependency, streams instantly ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-14 pb-16 sm:pt-20 sm:pb-24 px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Trusted by Filipinos across the country
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-5 sm:mb-6">
            Hire Trusted Local<br className="hidden sm:block" />
            {" "}<span className="text-primary">Service </span><span className="text-brand">Professionals</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
            Post a job, receive quotes from verified providers, and pay with full escrow protection. Plumbing, electrical, cleaning, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 sm:mb-12">
            <Link
              href="/register?role=client"
              className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Post a Job — It&apos;s Free
            </Link>
            <Link
              href="/register?role=provider"
              className="btn-secondary text-sm sm:text-base px-6 sm:px-8 py-3 rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Become a Provider <ArrowRight className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500">
            {[
              { icon: <CheckCircle className="h-4 w-4 text-brand" />, text: "Free to post a job" },
              { icon: <Lock        className="h-4 w-4 text-primary" />, text: "Escrow payment protection" },
              { icon: <Users       className="h-4 w-4 text-brand"  />, text: "500+ verified providers" },
            ].map((i) => (
              <span key={i.text} className="flex items-center gap-1.5">
                {i.icon} {i.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <Suspense fallback={<div className="h-24 border-y border-slate-100 bg-slate-50/70 animate-pulse" />}>
        <StatsStrip />
      </Suspense>

      {/* ── Categories — deferred ── */}
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>

      {/* ── How it works — no data dependency ── */}
      <section className="bg-slate-50 py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500 text-sm">Three simple steps to get the job done.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 relative">
            <div className="hidden sm:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            {[
              { icon: <Briefcase className="h-6 w-6 text-primary" />, title: "Post a Job", desc: "Describe what you need, set your budget, and pick a schedule. Takes under 2 minutes." },
              { icon: <Star      className="h-6 w-6 text-primary" />, title: "Get Quotes",  desc: "Receive competitive quotes from verified local providers — usually within hours." },
              { icon: <Shield    className="h-6 w-6 text-primary" />, title: "Pay Safely",  desc: "Funds are held securely in escrow and only released after you approve the work." },
            ].map((step, i) => (
              <div key={step.title} className="relative bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex flex-col items-center text-center gap-3 hover:shadow-card-hover transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <h3 className="font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Providers — deferred ── */}
      <Suspense fallback={<TopProvidersSkeleton />}>
        <TopProvidersSection />
      </Suspense>

      {/* ── Why LocalPro — no data dependency ── */}
      <section className="bg-slate-50 py-12 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Why choose LocalPro?</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Built for the Filipino market, with the protections you deserve.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Shield      className="h-6 w-6 text-primary" />, title: "Escrow Protection",  desc: "Your payment is only released when you're 100% satisfied with the work." },
              { icon: <CheckCircle className="h-6 w-6 text-brand"   />, title: "Verified Providers", desc: "Every provider goes through identity and background verification (KYC)." },
              { icon: <MapPin      className="h-6 w-6 text-primary" />, title: "Local, Not Global",  desc: "We focus on Filipino neighborhoods and local service providers — no overseas middlemen." },
              { icon: <TrendingUp  className="h-6 w-6 text-brand"   />, title: "Rated & Reviewed",   desc: "Transparent reviews from real clients keep quality high and providers accountable." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 flex flex-col gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider Tiers ── */}
      <section className="bg-white py-12 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-5">
              🏆 Provider Reward Tiers
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Grow your business with LocalPro</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">The more jobs you complete, the more perks you unlock — lower fees, higher visibility, and exclusive opportunities.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 sm:mt-12">
            {/* Bronze */}
            <div className="relative rounded-2xl border border-orange-200 bg-orange-50/50 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥉</span>
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Bronze</p>
                  <p className="text-sm font-bold text-slate-800">Starter</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />Listed in search results</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />Quote on any job</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />Earnings dashboard</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />Standard support</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-auto pt-2 border-t border-orange-100">Starting tier</p>
            </div>

            {/* Silver */}
            <div className="relative rounded-2xl border border-slate-300 bg-slate-50 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥈</span>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Silver</p>
                  <p className="text-sm font-bold text-slate-800">Verified</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />&ldquo;Verified Provider&rdquo; badge</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />Priority listing in search</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />Early job alerts</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />Faster payouts (2 days)</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-auto pt-2 border-t border-slate-200">10+ jobs · 4.0 ★</p>
            </div>

            {/* Gold */}
            <div className="relative rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col gap-3 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]">
              <div className="absolute -top-3 right-4">
                <span className="inline-block text-[10px] font-bold bg-amber-400 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Popular</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Gold</p>
                  <p className="text-sm font-bold text-slate-800">Top Rated</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />&ldquo;Top Rated&rdquo; badge + boosted ranking</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />Featured on homepage &amp; categories</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />Reduced commission <span className="line-through text-slate-400">15%</span> → <strong className="text-amber-700">11%</strong></li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />AI-powered tools unlocked</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />B2B &amp; bulk job access</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-auto pt-2 border-t border-amber-200">30+ jobs · 4.5 ★ · 85% completion</p>
            </div>

            {/* Elite */}
            <div className="relative rounded-2xl border border-violet-300 bg-gradient-to-b from-violet-50 to-white p-5 flex flex-col gap-3 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
              <div className="absolute -top-3 right-4">
                <span className="inline-block text-[10px] font-bold bg-violet-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Elite</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <div>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Elite Pro</p>
                  <p className="text-sm font-bold text-slate-800">Premium</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />&ldquo;Elite Pro&rdquo; profile highlight card</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />Lowest commission at <strong className="text-violet-700">6%</strong></li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />Instant payout option</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />Premium client access (hotels, firms)</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />Advanced analytics dashboard</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-auto pt-2 border-t border-violet-100">75+ jobs · 4.8 ★ · verified track record</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/register?role=provider" className="inline-flex items-center gap-2 btn-primary text-sm px-6 py-2.5 rounded-xl shadow-sm">
              Start as a provider — it&apos;s free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Partners ── */}
      <section className="border-y border-slate-100 bg-white py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 sm:mb-8">Trusted Partners</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-3 group">
              <div className="w-20 h-20 rounded-2xl border border-slate-200 shadow-sm bg-white flex items-center justify-center overflow-hidden group-hover:border-primary/40 group-hover:shadow-card-hover transition-all p-2">
                <Image
                  src="/official_seal_ormoc.png"
                  alt="Ormoc City official seal"
                  className="w-full h-full object-contain"
                  width={80}
                  height={80}
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">Ormoc City LGU</p>
                <p className="text-xs text-slate-400 mt-0.5">Official Government Partner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative overflow-hidden bg-primary py-14 sm:py-20 px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 leading-tight">Ready to get started?</h2>
          <p className="text-white/75 mb-8 sm:mb-10 text-sm leading-relaxed max-w-lg mx-auto">
            Join thousands of clients and providers on LocalPro. It&apos;s completely free to sign up and post your first job.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=client"
              className="bg-white text-primary font-semibold text-sm px-6 sm:px-8 py-3 rounded-xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-md"
            >
              I need a service
            </Link>
            <Link
              href="/register?role=provider"
              className="bg-white/10 border border-white/30 text-white font-semibold text-sm px-6 sm:px-8 py-3 rounded-xl hover:bg-white/20 hover:-translate-y-0.5 transition-all"
            >
              I offer services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-10 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 sm:gap-10 mb-8 sm:mb-10">
            <div className="flex flex-col gap-3 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-xs leading-none">LP</span>
                </div>
                <span className="text-base font-bold">
                  <span className="text-primary-300">Local</span><span className="text-brand-400">Pro</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The trusted marketplace connecting Filipino clients with verified local service professionals.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 sm:gap-x-16 gap-y-8">
              <div>
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Platform</p>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/register?role=client"   className="hover:text-white transition-colors">Post a Job</Link></li>
                  <li><Link href="/register?role=provider" className="hover:text-white transition-colors">Become a Provider</Link></li>
                  <li><Link href="/login"                  className="hover:text-white transition-colors">Log in</Link></li>
                  <li><Link href="/register"               className="hover:text-white transition-colors">Sign up</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Legal</p>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms"   className="hover:text-white transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
            <p>Made with ❤️ in the Philippines</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
