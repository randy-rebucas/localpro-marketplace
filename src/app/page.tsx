import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import ProviderProfile from "@/models/ProviderProfile";
import Review from "@/models/Review";
import "@/models/User"; // ensure User schema is registered for ProviderProfile.populate
import Link from "next/link";
import { CheckCircle, Briefcase, Star, Shield, ArrowRight, MapPin, Users, TrendingUp, Lock } from "lucide-react";
import Image from "next/image";

// ── data helpers ──────────────────────────────────────────────────────────────

async function getHomeData() {
  try {
    await connectDB();

    const [categories, topProviders] = await Promise.all([
      Category.find().sort({ order: 1 }).limit(12).lean(),
      ProviderProfile.find({ availabilityStatus: "available" })
        .sort({ avgRating: -1, completedJobCount: -1 })
        .limit(6)
        .populate("userId", "name isVerified")
        .lean(),
    ]);

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

    return { categories, topProviders, countMap };
  } catch (err) {
    console.error("[homepage] getHomeData failed:", err);
    return { categories: [], topProviders: [], countMap: {} as Record<string, number> };
  }
}

// ── page component ────────────────────────────────────────────────────────────

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

  const { categories, topProviders, countMap } = await getHomeData();

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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-20 pb-24 px-4">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Trusted by Filipinos across the country
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Hire Trusted Local<br />
            <span className="text-primary">Service </span><span className="text-brand">Professionals</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Post a job, receive quotes from verified providers, and pay with full escrow protection. Plumbing, electrical, cleaning, and more.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/register?role=client"
              className="btn-primary text-base px-8 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Post a Job — It&apos;s Free
            </Link>
            <Link
              href="/register?role=provider"
              className="btn-secondary text-base px-8 py-3 rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Become a Provider <ArrowRight className="inline h-4 w-4 ml-1" />
            </Link>
          </div>

          {/* Social proof row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
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
      <section className="border-y border-slate-100 bg-slate-50/70 py-8 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { icon: <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />, value: "10,000+", label: "Jobs completed" },
            { icon: <Users      className="h-5 w-5 text-brand mx-auto mb-1" />,   value: "500+",    label: "Verified providers" },
            { icon: <Star       className="h-5 w-5 text-amber-400 fill-amber-400 mx-auto mb-1" />, value: "4.8",      label: "Average rating" },
          ].map((s) => (
            <div key={s.label}>
              {s.icon}
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Browse by Service</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Whatever you need done, we&apos;ve got a pro for it.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
              return (
                <Link
                  key={String(c._id)}
                  href={`/register?role=client&category=${c.slug}`}
                  className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-slate-200 hover:border-primary/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all bg-white text-center"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">{c.icon}</span>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-primary transition-colors leading-tight">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500 text-sm">Three simple steps to get the job done.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
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

      {/* ── Top Providers ── */}
      {topProviders.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Top-Rated Providers</h2>
              <p className="text-slate-500 text-sm">Ready to take on your next job.</p>
            </div>
            <Link href="/register?role=client" className="text-sm font-medium text-primary hover:underline hidden sm:block shrink-0">
              Find more providers →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topProviders.map((p) => {
              const profile = p as unknown as {
                _id: string;
                userId: { _id: string; name: string; isVerified: boolean };
                bio: string;
                avgRating: number;
                completedJobCount: number;
                skills: string[];
                hourlyRate?: number;
              };
              const initials = profile.userId?.name
                ?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
              const reviews = countMap[String(profile.userId?._id)] ?? 0;

              return (
                <div
                  key={String(profile._id)}
                  className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/15">
                      <span className="text-sm font-bold text-primary">{initials}</span>
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
      )}

      {/* ── Why LocalPro ── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Why choose LocalPro?</h2>
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

      {/* ── Partners ── */}
      <section className="border-y border-slate-100 bg-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">Trusted Partners</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Ormoc City LGU */}
            <div className="flex flex-col items-center gap-3 group">
              <div className="w-20 h-20 rounded-2xl border border-slate-200 shadow-sm bg-white flex items-center justify-center overflow-hidden group-hover:border-primary/40 group-hover:shadow-card-hover transition-all p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src="/official_seal_ormoc.png"
                  alt="Ormoc City official seal"
                  className="w-full h-full object-contain"
                  width={80}
                  height={80}
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
      <section className="relative overflow-hidden bg-primary py-20 px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">Ready to get started?</h2>
          <p className="text-white/75 mb-10 text-sm leading-relaxed max-w-lg mx-auto">
            Join thousands of clients and providers on LocalPro. It&apos;s completely free to sign up and post your first job.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=client"
              className="bg-white text-primary font-semibold text-sm px-8 py-3 rounded-xl hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-md"
            >
              I need a service
            </Link>
            <Link
              href="/register?role=provider"
              className="bg-white/10 border border-white/30 text-white font-semibold text-sm px-8 py-3 rounded-xl hover:bg-white/20 hover:-translate-y-0.5 transition-all"
            >
              I offer services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            {/* Brand */}
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

            {/* Links */}
            <div className="flex flex-wrap gap-x-16 gap-y-8">
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
