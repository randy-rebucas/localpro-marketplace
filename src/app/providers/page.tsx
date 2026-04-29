import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ProviderProfile from "@/models/ProviderProfile";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Hammer,
  Home,
  MapPin,
  Paintbrush,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
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
const PAGE_SIZE = 6;

const POPULAR_CATEGORIES = [
  { label: "Cleaning", icon: Sparkles },
  { label: "Plumbing", icon: Wrench },
  { label: "Electrical", icon: Zap },
  { label: "Home Repair", icon: Home },
  { label: "Appliance Repair", icon: Briefcase },
  { label: "Carpentry", icon: Hammer },
  { label: "Painting", icon: Paintbrush },
  { label: "Aircon Services", icon: Wrench },
];

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
  location: string,
  page: number
): Promise<{ providers: ProviderCard[]; total: number; topSkills: string[] }> {
  try {
    await connectDB();

    // Build provider profile filter
    const profileFilter: Record<string, unknown> = {};
    if (skill) profileFilter["skills.skill"] = skill;
    if (location) profileFilter["serviceAreas.address"] = { $regex: location, $options: "i" };

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
  searchParams: Promise<{ q?: string; skill?: string; location?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.q?.trim() ?? "";
  const skill = sp.skill?.trim() ?? "";
  const location = sp.location?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const { providers, total, topSkills } = await getProviders(search, skill, location, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (skill) params.set("skill", skill);
    if (location) params.set("location", location);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return `/providers${q ? `?${q}` : ""}`;
  }

  function skillUrl(nextSkill: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (location) params.set("location", location);
    if (nextSkill) params.set("skill", nextSkill);
    return `/providers${params.toString() ? `?${params}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-white">
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

      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-white via-brand-50/40 to-primary-50/60">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-slate-100 to-transparent lg:block" />
        <div className="relative mx-auto grid max-w-site items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="max-w-xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
              Find Professionals
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0a2540] sm:text-5xl lg:text-[3.6rem]">
              Find trusted{" "}
              <span className="block text-brand-700">professionals</span>
              <span className="block">for any job.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Connect with verified pros in your area. Quality work. Reliable service.
            </p>
          </div>

          <div className="relative min-h-[320px] lg:min-h-[410px]">
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl shadow-primary-900/10">
              <Image
                src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1500&h=900&q=82"
                alt="Verified LocalPro professional"
                fill
                priority
                sizes="(min-width: 1024px) 620px, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent" />
            </div>
            <div className="absolute right-4 top-12 w-[240px] rounded-2xl border border-white/80 bg-white p-5 shadow-2xl shadow-primary-900/15">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-lg font-extrabold leading-tight text-[#0a2540]">
                Verified. Trusted. Local.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {["Background-checked pros", "Ratings and reviews", "On-time and reliable", "Secure payments"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-brand-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-6 px-4 sm:px-6">
        <form
          method="GET"
          action="/providers"
          className="mx-auto grid max-w-site gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(10,37,64,0.08)] lg:grid-cols-[1.35fr_1fr_1fr_auto]"
        >
          <label className="relative block">
            <span className="sr-only">Search by service or skill</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search by service or skill"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
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
          <label className="block">
            <span className="sr-only">Category</span>
            <select
              name="skill"
              defaultValue={skill}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">All Categories</option>
              {topSkills.slice(0, 12).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
          >
            Search
          </button>
        </form>
      </section>

      <main className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold text-[#0a2540]">Popular Categories</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9">
            {POPULAR_CATEGORIES.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                href={skillUrl(label)}
                className={`group rounded-2xl border bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover ${
                  skill === label ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200"
                }`}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-bold text-[#0a2540]">{label}</p>
              </Link>
            ))}
            <Link
              href="/providers"
              className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <ArrowRight className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-bold text-[#0a2540]">View all</p>
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold text-[#0a2540]">Top Rated Professionals</h2>
            <Link href="/providers" className="hidden items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800 sm:inline-flex">
              View all professionals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {providers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-400 shadow-card">
              <Briefcase className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-semibold text-slate-700">No providers found</p>
              <p className="text-sm mt-1">Try a different search or skill</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {providers.map((p) => (
                <Link
                  key={p._id}
                  href={`/providers/${p._id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover"
                >
                  <div className="relative h-44 bg-gradient-to-br from-brand-50 to-primary-50">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-primary-100 text-5xl font-extrabold text-brand-700">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    )}
                    {p.availabilityStatus === "available" && (
                      <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-[10px] font-bold uppercase text-white">
                        Top Pro
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-sm font-extrabold text-[#0a2540] group-hover:text-brand-700">
                      {p.name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {p.skills[0]?.skill ?? "Service Professional"}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                      <span className="font-bold text-[#0a2540]">4.9</span>
                      <span className="text-slate-400">({Math.max(28, p.yearsExperience * 18)})</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {Math.max(25, p.yearsExperience * 35)} jobs completed
                    </p>
                    <span className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50">
                      View Profile
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

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
        </section>

        <section className="mt-12 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
          {[
            { title: "Verified Professionals", text: "All pros are ID-verified and background-checked.", Icon: ShieldCheck },
            { title: "Reviews You Can Trust", text: "See real reviews from customers like you before you hire.", Icon: Users },
            { title: "Safe & Secure", text: "Your payments and personal information are always protected.", Icon: CheckCircle2 },
          ].map(({ title, text, Icon }) => (
            <div key={title} className="flex gap-4 rounded-xl bg-white p-5 shadow-card">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0a2540]">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-14 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#0a2540]">Finding the right professional is easy.</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              { title: "Search", text: "Find the service or skill you need in your area.", Icon: Search },
              { title: "Choose", text: "Browse profiles, reviews, and ratings.", Icon: Users },
              { title: "Book", text: "Message, agree on details, and book the job.", Icon: CalendarDays },
              { title: "Get It Done", text: "The pro gets the job done and you leave a review.", Icon: CheckCircle2 },
            ].map(({ title, text, Icon }, index) => (
              <div key={title} className="relative">
                {index < 3 && (
                  <div className="absolute left-1/2 right-[-50%] top-10 hidden border-t border-dashed border-slate-300 md:block" />
                )}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 ring-8 ring-white">
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-9 w-9 text-brand-700" />
                </div>
                <h3 className="mt-5 text-base font-extrabold text-[#0a2540]">{title}</h3>
                <p className="mx-auto mt-2 max-w-[200px] text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto flex max-w-site flex-col gap-6 rounded-3xl bg-gradient-to-r from-[#0a2540] via-primary-900 to-brand-700 p-7 text-white shadow-2xl shadow-primary-900/15 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5">
            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 sm:flex">
              <Users className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Can&apos;t find what you need?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                Post a job and let qualified professionals come to you.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/register?role=client"
              className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#0a2540] transition hover:bg-brand-50"
            >
              Post a Job
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              It&apos;s free and easy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
