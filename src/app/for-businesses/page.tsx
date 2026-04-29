import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChefHat,
  ClipboardList,
  Grid3X3,
  HardHat,
  Headphones,
  Hotel,
  Landmark,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicHeader from "@/components/layout/PublicHeader";

export const metadata: Metadata = {
  title: "For Businesses",
  description:
    "Smart workforce and service solutions for offices, restaurants, property teams, hotels, LGUs, and growing businesses.",
  alternates: { canonical: "/for-businesses" },
};

const heroBullets = [
  "Verified and skilled professionals",
  "On-demand or scheduled services",
  "Transparent pricing, no hidden fees",
];

const stats = [
  { value: "50,000+", label: "Businesses Served", Icon: Building2 },
  { value: "10,000+", label: "Verified Professionals", Icon: Users },
  { value: "200+", label: "Service Categories", Icon: Grid3X3 },
  { value: "99%", label: "Satisfaction Rate", Icon: ShieldCheck },
];

const solutions = [
  {
    title: "Offices & Corporate",
    description: "Maintenance, admin support, cleaning, and more",
    Icon: Building2,
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "Restaurants & Food Businesses",
    description: "Deep cleaning, pest control, equipment repair, and more",
    Icon: ChefHat,
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "Salons & Wellness Businesses",
    description: "Freelance stylists, nail techs, massage therapists, and more",
    Icon: Scissors,
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "Construction & Engineering Firms",
    description: "Skilled workers, equipment operators, and project support",
    Icon: HardHat,
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "Property Management",
    description: "Turnover cleaning, repairs, maintenance, and inspections",
    Icon: Building2,
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "Hotels & Hospitality",
    description: "Massage, maintenance, laundry, housekeeping, and more",
    Icon: Hotel,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=520&h=300&q=80",
  },
  {
    title: "LGUs",
    description: "Livelihood programs, job matching, and TESDA providers",
    Icon: Landmark,
    image:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=520&h=300&q=80",
  },
];

const steps = [
  {
    title: "Post Your Need",
    description: "Tell us what service you need and when.",
    Icon: Search,
  },
  {
    title: "We Match You",
    description: "Get connected with verified pros that fit your needs.",
    Icon: Users,
  },
  {
    title: "Schedule or Book",
    description: "Choose a schedule that works for your business.",
    Icon: CalendarDays,
  },
  {
    title: "Get the Job Done",
    description: "Pros deliver quality service, on time.",
    Icon: ShieldCheck,
  },
  {
    title: "Review & Manage",
    description: "Rate, review, and manage bookings in one place.",
    Icon: Star,
  },
];

const advantages = [
  "One place to request, schedule, and manage service work",
  "Verified professionals for recurring or one-time needs",
  "Flexible support for single-location and multi-site operations",
  "Clear booking history, status updates, and service documentation",
];

export default function ForBusinessesPage() {
  return (
    <div className="min-h-screen bg-white text-[#0a2540]">
      <PublicHeader />
      <main id="main-content">
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-brand-50/60">
          <div className="absolute inset-y-0 right-0 hidden w-[58%] bg-gradient-to-l from-primary-100/70 via-brand-50/60 to-transparent lg:block" />
          <div className="relative mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
            <div className="max-w-xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
                For Businesses
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0a2540] sm:text-5xl lg:text-[4rem]">
                Smart solutions{" "}
                <span className="block">for every business.</span>
                <span className="block text-brand-700">All in one platform.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                Save time, reduce costs, and keep your operations running smoothly with verified local professionals.
              </p>
              <ul className="mt-7 space-y-3">
                {heroBullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register?role=client"
                  className="inline-flex items-center justify-center rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-600"
                >
                  Get Started
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/85 px-7 py-3.5 text-sm font-bold text-[#0a2540] transition hover:bg-slate-50"
                >
                  Talk to Our Team
                  <Headphones className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[560px]">
              <div className="absolute inset-x-4 bottom-0 top-0 overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl shadow-primary-900/10 lg:inset-x-0">
                <Image
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1500&h=1200&q=82"
                  alt="Business manager coordinating service work with LocalPro professionals"
                  fill
                  priority
                  sizes="(min-width: 1024px) 620px, 100vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/10 to-transparent" />
              </div>
              <div className="absolute right-2 top-8 w-[230px] rounded-2xl bg-[#0a2540] p-5 text-white shadow-2xl shadow-primary-900/20 sm:right-8 lg:right-2 lg:top-12">
                <div className="space-y-4">
                  {stats.map(({ value, label, Icon }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                        <Icon className="h-5 w-5 text-brand-300" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold leading-none">{value}</p>
                        <p className="mt-1 text-xs text-white/75">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Solutions</p>
              <h2 className="mt-3 text-2xl font-extrabold text-[#0a2540] sm:text-3xl">
                Solutions for every type of business
              </h2>
            </div>
            <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
              View all services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {solutions.map(({ title, description, Icon, image }) => (
              <Link
                key={title}
                href="/register?role=client"
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(10,37,64,0.07)] transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_18px_45px_rgba(10,37,64,0.12)]"
              >
                <div className="p-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold leading-tight text-[#0a2540]">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
                </div>
                <div className="relative h-24 overflow-hidden">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 170px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-site">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">How it works</p>
              <h2 className="mt-3 text-3xl font-extrabold text-[#0a2540] sm:text-4xl">
                How LocalPro helps your business
              </h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_220px]">
              <div className="grid gap-7 md:grid-cols-5">
                {steps.map(({ title, description, Icon }, index) => (
                  <div key={title} className="relative text-center">
                    {index < steps.length - 1 && (
                      <div className="absolute left-1/2 right-[-50%] top-10 hidden border-t border-dashed border-slate-300 md:block" />
                    )}
                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                      <Icon className="h-8 w-8 text-brand-700" />
                    </div>
                    <h3 className="mt-5 text-sm font-extrabold text-[#0a2540]">
                      {index + 1}. {title}
                    </h3>
                    <p className="mx-auto mt-2 max-w-[190px] text-xs leading-5 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Headphones className="h-6 w-6" />
                </div>
                <h3 className="text-base font-extrabold text-[#0a2540]">Need help?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Our Business Success Team is here to assist you.
                </p>
                <Link href="/support" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-site gap-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_16px_55px_rgba(10,37,64,0.08)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">Built for operations</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#0a2540] sm:text-4xl">
                Run facilities, staffing, and recurring services with less admin.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                From urgent repairs to scheduled maintenance, LocalPro gives your team a reliable way to request and manage work across locations.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {advantages.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-14 sm:px-6">
          <div className="mx-auto flex max-w-site flex-col gap-6 rounded-3xl bg-gradient-to-r from-[#0a2540] via-primary-900 to-brand-700 p-7 text-white shadow-2xl shadow-primary-900/15 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-5">
              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 sm:flex">
                <ClipboardList className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to simplify business services?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                  Start with one request or talk with our team about recurring support.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=client"
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#0a2540] transition hover:bg-brand-50"
              >
                Get Started
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Talk to Our Team
                <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
