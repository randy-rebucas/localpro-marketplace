import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import User from "@/models/User";
import ProviderProfile from "@/models/ProviderProfile";
import Review from "@/models/Review";
import Link from "next/link";
import { CheckCircle, Briefcase, Star, Shield, Clock, ArrowRight } from "lucide-react";

// ── data helpers ──────────────────────────────────────────────────────────────

async function getHomeData() {
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

      {/* ── Public nav ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="text-lg font-bold text-slate-900">LocalPro</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
            <Link href="/register" className="btn-primary text-sm">Get started</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-blue-50 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-6">
            <CheckCircle className="h-3.5 w-3.5" /> Trusted by thousands of Filipinos
          </span>
          <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-5">
            Find Trusted Local<br />
            <span className="text-primary">Service Professionals</span>
          </h1>
          <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
            Post a job, get quotes from verified providers, and pay securely with escrow protection.
            Plumbing, electrical, cleaning — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=client" className="btn-primary text-base px-8 py-3">
              Post a Job — It&apos;s Free
            </Link>
            <Link href="/register?role=provider" className="btn-secondary text-base px-8 py-3">
              Become a Provider <ArrowRight className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-100 blur-3xl" />
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-slate-100 bg-white py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: "10,000+", label: "Jobs completed" },
            { value: "500+",    label: "Verified providers" },
            { value: "4.8 ★",   label: "Average rating" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-primary">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Browse by Service</h2>
        <p className="text-slate-500 text-center mb-10 text-sm">Whatever you need done, we&apos;ve got a pro for it.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const c = cat as unknown as { _id: string; name: string; icon: string; slug: string };
            return (
              <Link
                key={String(c._id)}
                href={`/register?role=client&category=${c.slug}`}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all bg-white text-center"
              >
                <span className="text-3xl">{c.icon}</span>
                <span className="text-xs font-medium text-slate-700 group-hover:text-primary transition-colors">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-slate-50 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">How It Works</h2>
          <p className="text-slate-500 text-center mb-12 text-sm">Three simple steps to get the job done.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { icon: <Briefcase className="h-7 w-7 text-primary" />, title: "Post a Job", desc: "Describe what you need, set your budget, and choose a schedule." },
              { icon: <Star       className="h-7 w-7 text-primary" />, title: "Get Quotes",  desc: "Receive quotes from verified local providers within hours." },
              { icon: <Shield     className="h-7 w-7 text-primary" />, title: "Pay Safely",  desc: "Funds are held in escrow and released only after you approve the work." },
            ].map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center relative">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                </div>
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
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-3">Top-Rated Providers</h2>
          <p className="text-slate-500 text-center mb-10 text-sm">Ready to take on your next job.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div key={String(profile._id)} className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-slate-900 text-sm truncate">{profile.userId?.name}</p>
                        {profile.userId?.isVerified && (
                          <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{profile.completedJobCount} jobs · {reviews} review{reviews !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-400" />
                      <span className="text-sm font-semibold text-slate-700">{profile.avgRating > 0 ? profile.avgRating.toFixed(1) : "New"}</span>
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-xs text-slate-500 line-clamp-2">{profile.bio}</p>
                  )}
                  {profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 3).map((s) => (
                        <span key={s} className="badge bg-slate-100 text-slate-600 text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                  {profile.hourlyRate != null && (
                    <p className="text-xs text-slate-400">From <span className="font-semibold text-slate-700">₱{profile.hourlyRate.toLocaleString()}/hr</span></p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <section className="bg-primary py-16 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-extrabold mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/80 mb-8 text-sm">Join thousands of clients and providers on LocalPro today — it&apos;s completely free to sign up.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=client"   className="btn bg-white text-primary font-semibold hover:bg-slate-100 text-sm px-8 py-3 rounded-xl">
              I need a service
            </Link>
            <Link href="/register?role=provider" className="btn bg-primary-dark border border-white/30 text-white font-semibold hover:bg-white/10 text-sm px-8 py-3 rounded-xl">
              I offer services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">LP</span>
            </div>
            <span className="text-sm font-semibold text-white">LocalPro</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login"    className="hover:text-white transition-colors">Log in</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} LocalPro. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
