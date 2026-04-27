import { redirect } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  Heart,
  Home,
  Landmark,
  LayoutGrid,
  Quote,
  Shield,
  Star,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Category from "@/models/Category";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import ScrollReveal from "@/components/homepage/ScrollReveal";
import HeroSearchBar from "@/components/homepage/HeroSearchBar";
import PortraitImage from "@/components/homepage/PortraitImage";
import { HOMEPAGE_PORTRAITS } from "@/constants/homepage-portraits";

/** Homepage reads categories and stats from MongoDB — skip static prerender at build time. */
export const dynamic = "force-dynamic";

const BUSINESS_BG =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=70";

async function HeroCategoriesData() {
  await connectDB();
  const cats = await Category.find().sort({ order: 1 }).limit(12).lean();
  return cats.map((cat) => {
    const c = cat as unknown as { name: string; icon: string; slug: string };
    return { name: c.name, icon: c.icon, slug: c.slug };
  });
}

const POPULAR_SERVICE_CARDS: Array<{
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconClass: string;
}> = [
  {
    title: "Home Services",
    description: "Cleaning, repairs, handyman work, and everyday upkeep for your residence.",
    href: "/register?role=client&category=handyman",
    Icon: Home,
    iconClass: "bg-brand/15 text-brand ring-1 ring-brand/30",
  },
  {
    title: "Businesses",
    description: "Support for offices, retail, and multi-site teams — maintenance, electrical, plumbing, and more.",
    href: "/register?role=client",
    Icon: Briefcase,
    iconClass: "bg-primary-50 text-primary-700 ring-1 ring-primary-200/80",
  },
  {
    title: "Property Services",
    description: "Turnover cleaning, inspections, and upkeep for condos, rentals, and portfolios.",
    href: "/register?role=client&category=cleaning",
    Icon: Warehouse,
    iconClass: "bg-brand/15 text-brand ring-1 ring-brand/30",
  },
  {
    title: "Construction",
    description: "Skilled trades for builds, renovations, masonry, and structural projects.",
    href: "/register?role=client&category=carpentry",
    Icon: HardHat,
    iconClass: "bg-primary-50 text-primary-700 ring-1 ring-primary-200/80",
  },
  {
    title: "LGU Services",
    description: "Public employment programs, workforce onboarding, and municipal partnerships.",
    href: "/peso-program",
    Icon: Landmark,
    iconClass: "bg-brand/15 text-brand ring-1 ring-brand/30",
  },
  {
    title: "More Services",
    description: "Browse 100+ categories — from IT to automotive to health and beauty.",
    href: "/jobs",
    Icon: LayoutGrid,
    iconClass: "bg-primary-50 text-primary-700 ring-1 ring-primary-200/80",
  },
];

function PopularServicesCurated() {
  return (
    <section className="bg-white max-w-site mx-auto px-4 sm:px-6 py-20 sm:py-24 lg:py-28">
      <ScrollReveal>
        <p className="text-[11px] sm:text-xs font-bold text-[#0a2540] uppercase tracking-[0.28em] text-center mb-10 sm:mb-14">
          Popular services
        </p>
      </ScrollReveal>
      <ScrollReveal stagger>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
          {POPULAR_SERVICE_CARDS.map(({ title, description, href, Icon, iconClass }) => (
            <Link
              key={title}
              href={href}
              aria-label={`Browse ${title}`}
              className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(10,37,64,0.06)] hover:shadow-[0_14px_40px_rgba(10,37,64,0.1)] hover:border-brand/30 transition-all duration-300"
            >
              <div
                className={`mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full ${iconClass}`}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
              </div>
              <h3 className="text-[15px] sm:text-base font-bold text-[#0a2540] group-hover:text-primary-700 transition-colors leading-snug">
                {title}
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed flex-1 line-clamp-4">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </ScrollReveal>
      <div className="mt-12 sm:mt-14 flex justify-center">
        <Link
          href="/jobs"
          className="inline-flex items-center justify-center rounded-xl border-2 border-[#0a2540]/20 bg-white px-10 py-3.5 text-sm font-semibold text-[#0a2540] hover:border-brand/50 hover:bg-brand/[0.06] transition-colors"
        >
          View All Services
        </Link>
      </div>
    </section>
  );
}

function WhyLocalProSection() {
  const stats = [
    { value: "10,000+", label: "Verified Pros" },
    { value: "50,000+", label: "Jobs Completed" },
    { value: "4.9/5", label: "Customer Rating" },
    { value: "100+", label: "Service Categories" },
  ];

  const checklist = [
    "Background-checked Professionals",
    "Easy Booking",
    "Real-time Tracking",
    "Satisfaction Guaranteed",
  ];

  return (
    <section className="bg-[#eef2f6] py-20 sm:py-24 lg:py-28 px-4 sm:px-6">
      <div className="max-w-site mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <ScrollReveal>
            <p className="text-[11px] sm:text-xs font-bold text-brand uppercase tracking-[0.28em] mb-4">
              Why choose LocalPro
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-[2.125rem] font-bold text-[#0a2540] leading-[1.2] mb-5">
              Top-rated pros. Proven results. Trusted by thousands.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-md">
              Hire with confidence: every pro is verified, every payment is protected, and support is a message away.
            </p>
            <ul className="space-y-4">
              {checklist.map((item) => (
                <li key={item} className="flex gap-3.5 text-slate-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span className="text-sm sm:text-base font-medium leading-relaxed pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-slate-200/80 bg-white px-5 py-6 sm:p-7 shadow-[0_4px_20px_rgba(10,37,64,0.06)]"
                >
                  <p className="text-2xl sm:text-[1.75rem] font-extrabold text-brand tracking-tight">{s.value}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{s.label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal>
          <div className="mt-14 sm:mt-16 rounded-2xl bg-gradient-to-br from-[#0a2540] to-[#06182c] px-6 sm:px-10 py-9 sm:py-11 border border-white/10 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-12">
              <div className="flex flex-col gap-5 flex-1">
                <Quote className="h-10 w-10 text-brand shrink-0" strokeWidth={1.25} />
                <blockquote className="text-base sm:text-lg text-white/95 leading-relaxed">
                  &ldquo;LocalPro made finding a reliable cleaner effortless. Clear pricing, verified pros, and the job was done exactly as promised.&rdquo;
                </blockquote>
                <p className="text-sm font-semibold text-white mt-auto">
                  Maria S. <span className="text-primary-200 font-normal">· Homeowner</span>
                </p>
              </div>
              <div className="flex justify-center lg:justify-end items-center shrink-0">
                <PortraitImage
                  src={HOMEPAGE_PORTRAITS.mariaTestimonial.src}
                  alt={HOMEPAGE_PORTRAITS.mariaTestimonial.alt}
                  size={128}
                  className="ring-4 ring-white/20 shadow-2xl"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const HOW_STEPS = [
  { n: 1, title: "Choose a Service", desc: "Browse categories or search for exactly what you need.", Icon: FileText },
  { n: 2, title: "Book in Minutes", desc: "Post your job, set your budget, and pick a time that works.", Icon: Calendar },
  { n: 3, title: "We Match You", desc: "Get quotes from verified pros in your area.", Icon: Users },
  { n: 4, title: "Job Done!", desc: "Work gets completed with escrow-backed peace of mind.", Icon: Wrench },
  { n: 5, title: "Rate & Review", desc: "Share feedback and help the community hire with confidence.", Icon: Heart },
];

const BUSINESS_PILLARS = [
  { title: "Reliable Professionals", desc: "Vetted teams for recurring facility needs", Icon: Shield },
  { title: "Customizable Solutions", desc: "Schedules and scopes that fit your sites", Icon: Building2 },
  { title: "Cost Effective", desc: "Competitive quotes and clear billing", Icon: DollarSign },
  { title: "Dedicated Support", desc: "A partner that scales with your operations", Icon: BadgeCheck },
];

export default async function RootPage() {
  const user = await getCurrentUser();
  const appPublicUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

  if (user) {
    const routes: Record<string, string> = {
      client: "/client/dashboard",
      provider: "/provider/dashboard",
      admin: "/admin/dashboard",
    };
    redirect(routes[user.role] ?? "/login");
  }

  const heroCategories = await HeroCategoriesData();

  return (
    <div className="min-h-screen bg-white text-slate-900">
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
                    text: "Post a job with your requirements and budget. Verified providers will send you quotes. You choose the best match, then pay securely through LocalPro escrow — funds are only released once you approve the completed work.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Are providers on LocalPro verified?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Every service provider goes through identity and background verification (KYC) before they can accept jobs.",
                  },
                },
              ],
            },
          ]),
        }}
      />

      <PublicHeader />

      {/* Hero — marketing layout: gradient panel, copy + segmented search, image + proof card */}
      <section className="relative border-b border-slate-200/80 bg-gradient-to-br from-[#f7f9fc] via-[#eef2f7] to-[#e6ebf3]">
        <div className="max-w-site mx-auto grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-0 items-stretch min-h-0">
          <div className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 xl:pr-10 flex flex-col justify-center order-2 lg:order-1">
            <h1 className="text-[1.85rem] sm:text-4xl lg:text-[2.55rem] xl:text-[2.8rem] font-extrabold text-[#0a2540] leading-[1.08] tracking-tight max-w-xl">
              Your Trusted{" "}
              <span className="text-brand">Local Pros</span>
              , Anytime You Need.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed">
              One platform for all your home, business, and property maintenance needs.
            </p>

            <div className="mt-9">
              <HeroSearchBar categories={heroCategories} />
            </div>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6 sm:gap-x-8 max-w-2xl">
              {[
                { label: "Verified Professionals", Icon: Shield },
                { label: "Transparent Pricing", Icon: DollarSign },
                { label: "On-Demand Availability", Icon: Clock },
                { label: "Satisfaction Guaranteed", Icon: BadgeCheck },
              ].map(({ label, Icon }) => (
                <div key={label} className="flex flex-col gap-2.5 text-slate-700">
                  <Icon className="h-6 w-6 text-brand" strokeWidth={2} />
                  <span className="text-xs sm:text-sm font-medium leading-snug text-[#0a2540]/90">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[300px] sm:min-h-[380px] lg:min-h-[min(600px,88vh)] order-1 lg:order-2">
            <Image
              src={HOMEPAGE_PORTRAITS.heroPro.src}
              alt={HOMEPAGE_PORTRAITS.heroPro.alt}
              fill
              priority
              className="object-cover object-[center_25%] lg:object-[center_30%]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a2540]/50 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#eef2f7]" />

            <div className="absolute bottom-5 left-4 right-4 sm:bottom-8 sm:left-6 sm:right-6 lg:bottom-12 lg:left-8 lg:right-10 z-10 flex justify-end">
              <div className="rounded-2xl bg-[#0a2540]/96 border border-white/10 p-5 sm:p-6 shadow-[0_24px_56px_rgba(0,0,0,0.3)] backdrop-blur-md w-full max-w-[340px]">
                <ul className="space-y-2.5 text-sm text-white/95 mb-5">
                  {["Trusted pros", "Hygienic spaces", "Happy customers"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-brand shrink-0 stroke-[2.5]" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="flex -space-x-2 mb-5">
                  {HOMEPAGE_PORTRAITS.socialProof.map((p, i) => (
                    <PortraitImage
                      key={p.src}
                      src={p.src}
                      alt={p.alt}
                      size={40}
                      priority={i === 0}
                      className="ring-2 ring-[#0a2540]"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-white font-bold text-sm pl-1.5">4.9/5</span>
                  <span className="text-white/80 text-xs sm:text-sm ml-1">
                    from 10,000+ happy customers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PopularServicesCurated />

      <WhyLocalProSection />

      {/* How it works — five steps with dashed connector */}
      <ScrollReveal>
        <section id="how-it-works" className="max-w-site mx-auto px-4 sm:px-6 py-20 sm:py-24 lg:py-28 scroll-mt-24 bg-white">
          <div className="flex items-center gap-4 mb-14 sm:mb-16">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[11px] sm:text-xs font-bold text-[#0a2540] uppercase tracking-[0.28em] whitespace-nowrap">
              How LocalPro works
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="relative">
            <div
              className="hidden lg:block absolute top-[1.875rem] left-[8%] right-[8%] border-t-2 border-dashed border-brand/50 z-0"
              aria-hidden
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-4 relative z-10">
              {HOW_STEPS.map((step) => (
                <div key={step.n} className="flex flex-col items-center text-center max-w-xs mx-auto lg:max-w-none">
                  <div className="relative mb-5 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-600 text-white shadow-md ring-4 ring-brand/20">
                    <step.Icon className="h-7 w-7" strokeWidth={2} />
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand text-xs font-extrabold shadow border border-brand/25">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#0a2540]">{step.title}</h3>
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* For businesses — blurred office backdrop */}
      <section className="relative min-h-[520px] py-24 sm:py-32 lg:py-36 px-4 sm:px-6 overflow-hidden flex items-center">
        <div className="absolute inset-0 scale-105" aria-hidden>
          <Image
            src={BUSINESS_BG}
            alt=""
            fill
            className="object-cover object-center blur-sm brightness-90"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-[#0a2540]/[0.92]" />
        <div className="relative z-10 max-w-site mx-auto grid lg:grid-cols-2 gap-14 lg:gap-16 items-center w-full">
          <div className="max-w-xl">
            <p className="text-xs sm:text-sm font-bold text-brand uppercase tracking-[0.2em] mb-4">For Businesses</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-5">
              One partner for all your facility needs.
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-9">
              From offices to retail and multi-site operations — book vetted pros, consolidate billing, and keep every location running smoothly.
            </p>
            <Link
              href="/register?role=client"
              className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors"
            >
              Learn more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {BUSINESS_PILLARS.map(({ title, desc, Icon }) => (
              <div
                key={title}
                className="rounded-xl border border-white/20 bg-white/[0.08] backdrop-blur-sm px-5 py-6 sm:p-6 text-center sm:text-left hover:bg-white/[0.12] transition-colors"
              >
                <Icon className="h-9 w-9 text-white mx-auto sm:mx-0 mb-3 sm:mb-4" strokeWidth={1.65} />
                <h3 className="font-semibold text-white text-[15px] leading-snug">{title}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-white/65 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <ScrollReveal>
        <section className="bg-[#f8fafc] py-20 sm:py-24 lg:py-28 px-4 sm:px-6">
          <div className="max-w-site mx-auto">
            <div className="flex items-center gap-4 mb-12 sm:mb-14">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-[11px] sm:text-xs font-bold text-[#0a2540] uppercase tracking-[0.28em] whitespace-nowrap">
                What our customers say
              </p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  quote:
                    "From electrical fixes to deep cleaning — verified pros, clear pricing, and work done right the first time.",
                  name: "John D.",
                  role: "Homeowner",
                  portrait: HOMEPAGE_PORTRAITS.testimonials[0],
                },
                {
                  quote:
                    "We use LocalPro across two branches — one schedule, consistent quality, and invoices we can actually track.",
                  name: "Miguel A.",
                  role: "Restaurant Owner",
                  portrait: HOMEPAGE_PORTRAITS.testimonials[1],
                },
                {
                  quote: "Escrow gave me confidence to try a new contractor. The work was excellent.",
                  name: "Carla P.",
                  role: "Property Manager",
                  portrait: HOMEPAGE_PORTRAITS.testimonials[2],
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(10,37,64,0.06)]"
                >
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-sm text-slate-700 leading-relaxed flex-1 mb-8">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3 mt-auto pt-5 border-t border-slate-100">
                    <PortraitImage src={t.portrait.src} alt={t.portrait.alt} size={48} className="ring-2 ring-slate-100" />
                    <div>
                      <p className="text-sm font-semibold text-[#0a2540]">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* App promo — phone | copy | QR + stores (reference layout) */}
      <section className="relative bg-gradient-to-b from-[#e8f5ea] via-[#f0f4f8] to-white py-20 sm:py-24 lg:py-28 px-4 sm:px-6 overflow-hidden border-t border-slate-200/60">
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-24 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='20' viewBox='0 0 60 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q15 0 30 20 T60 20' fill='none' stroke='%233ea53e' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 20px",
          }}
          aria-hidden
        />
        <div className="max-w-site mx-auto grid lg:grid-cols-[1fr_1.15fr_1fr] gap-12 lg:gap-8 xl:gap-12 items-center">
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="relative w-[210px] sm:w-[232px] aspect-[9/19] rounded-[2.35rem] border-[3px] border-[#0a2540] bg-slate-900 shadow-[0_28px_64px_rgba(10,37,64,0.22)] overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 flex justify-center pt-2 z-10">
                <div className="h-5 w-24 rounded-full bg-slate-800" />
              </div>
              <div className="absolute inset-x-3 top-10 bottom-3 rounded-xl overflow-hidden shadow-inner">
                <Image
                  src="/homepage.PNG"
                  alt="LocalPro app — dashboard screenshot"
                  fill
                  className="object-cover object-top"
                  sizes="232px"
                />
              </div>
            </div>
          </div>
          <div className="text-center lg:text-left order-1 lg:order-2 lg:pl-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0a2540] mb-3">
              Take LocalPro with you<span className="text-brand">!</span>
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base max-w-md mx-auto lg:mx-0">
              Post jobs, message pros, and track bookings from your phone. Scan the code or download from your store.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center lg:items-end gap-8 order-3 lg:pr-2">
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-md shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${appPublicUrl.replace(/\/$/, "")}/register?role=client`)}`}
                alt="QR code linking to LocalPro"
                width={160}
                height={160}
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-3 items-stretch sm:items-start w-full max-w-[200px]">
              <a
                href="https://apps.apple.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://toolbox.marketingtools.apple.com/api/badges/download-on-the-app-store/black/en-us?size=250x83"
                  alt="Download on the App Store"
                  width={160}
                  height={53}
                  className="h-[52px] w-auto"
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=asia.localpro.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                  alt="Get it on Google Play"
                  width={180}
                  height={70}
                  className="h-[58px] w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
