import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  WalletCards,
} from "lucide-react";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicHeader from "@/components/layout/PublicHeader";

export const metadata: Metadata = {
  title: "Become a Pro",
  description:
    "Grow your service business with LocalPro. Get matched with nearby customers, manage jobs, and receive secure payouts.",
  alternates: { canonical: "/for-pros" },
};

const heroBullets = [
  "Get matched with quality customers",
  "Manage jobs and bookings easily",
  "Get paid securely and on time",
];

const benefitCards = [
  {
    title: "More Jobs",
    description: "Get discovered by customers looking for trusted pros in your area.",
    Icon: UserPlus,
  },
  {
    title: "Flexible Schedule",
    description: "Choose jobs and time slots that work for your week.",
    Icon: CalendarDays,
  },
  {
    title: "Trusted & Secure",
    description: "Verified profiles and protected transactions help build confidence.",
    Icon: ShieldCheck,
  },
  {
    title: "Fast & Easy Payouts",
    description: "Receive earnings through simple, reliable payout workflows.",
    Icon: WalletCards,
  },
];

const steps = [
  {
    title: "Create Your Profile",
    description: "Sign up, verify your details, and tell us about your services.",
    Icon: UserPlus,
  },
  {
    title: "Get Approved",
    description: "We review your information and credentials for selected services.",
    Icon: ClipboardCheck,
  },
  {
    title: "Get Matched",
    description: "Receive job requests from nearby customers who need your skills.",
    Icon: Search,
  },
  {
    title: "Complete & Get Paid",
    description: "Finish the job, earn great reviews, and get paid securely.",
    Icon: Banknote,
  },
];

const requirements = [
  "Valid government-issued ID",
  "Proof of experience or portfolio, if applicable",
  "Required licenses or certifications for regulated services",
  "Background check for selected categories",
  "Bank or payout account",
];

const proPerks = [
  {
    title: "More opportunities, less hassle",
    description: "We bring customers to you so you can focus on the work.",
    Icon: HeartHandshake,
  },
  {
    title: "Save time",
    description: "Manage your schedule, location, and services in one place.",
    Icon: Clock3,
  },
  {
    title: "Build your reputation",
    description: "Get reviews, grow your profile, and stand out locally.",
    Icon: Star,
  },
  {
    title: "We have your back",
    description: "Our support team helps when a booking needs attention.",
    Icon: BadgeCheck,
  },
];

const testimonials = [
  {
    name: "Mark D.",
    role: "Electrician",
    quote:
      "LocalPro helps me get steady jobs without spending on ads. The app makes everything simple.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&h=96&q=80",
  },
  {
    name: "Jane R.",
    role: "House Cleaner",
    quote:
      "I choose jobs near me and manage my time better. Payments are always on time.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
  },
];

export default function ForProsPage() {
  return (
    <div className="min-h-screen bg-white text-[#0a2540]">
      <PublicHeader />
      <main id="main-content">
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-brand-50/45 to-primary-50/60">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-brand-100/70 to-transparent lg:block" />
          <div className="relative mx-auto grid max-w-site items-center gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[0.94fr_1.06fr] lg:py-20">
            <div className="max-w-xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
                Become a Pro
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-[#0a2540] sm:text-5xl lg:text-[4rem]">
                Grow your business{" "}
                <span className="block text-brand-700">with LocalPro</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                Join thousands of trusted professionals who find more jobs, save time, and build their reputation on a platform that works for them.
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
                  href="/register?role=provider"
                  className="inline-flex items-center justify-center rounded-xl bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-600"
                >
                  Sign Up as a Pro
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white/85 px-7 py-3.5 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[560px]">
              <div className="absolute inset-x-4 bottom-0 top-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-100 to-brand-100 shadow-2xl shadow-primary-900/10 lg:inset-x-0">
                <Image
                  src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1400&h=1500&q=82"
                  alt="Smiling verified LocalPro professional"
                  fill
                  priority
                  sizes="(min-width: 1024px) 580px, 100vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-transparent to-transparent" />
              </div>
              <div className="absolute right-2 top-12 max-w-[230px] rounded-2xl border border-white/80 bg-white p-5 shadow-2xl shadow-primary-900/15 sm:right-8 lg:right-0 lg:top-36">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <p className="text-lg font-extrabold leading-tight text-[#0a2540]">
                  Join a community of 10,000+ verified pros.
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  From plumbers to cleaners, electricians to designers, opportunities are waiting for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-3 px-4 sm:px-6">
          <div className="mx-auto grid max-w-site gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_50px_rgba(10,37,64,0.08)] sm:grid-cols-2 lg:grid-cols-4">
            {benefitCards.map(({ title, description, Icon }) => (
              <div key={title} className="flex gap-4 rounded-xl p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#0a2540]">{title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-site px-4 py-18 sm:px-6 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold text-[#0a2540] sm:text-4xl">
              Start in minutes and start getting jobs.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map(({ title, description, Icon }, index) => (
              <div key={title} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 right-[-50%] top-10 hidden border-t border-dashed border-slate-300 md:block" />
                )}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 ring-8 ring-white">
                  <span className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-9 w-9 text-brand-700" />
                </div>
                <h3 className="mt-5 text-base font-extrabold text-[#0a2540]">{title}</h3>
                <p className="mx-auto mt-2 max-w-[210px] text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-site gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
              <h2 className="text-lg font-extrabold text-[#0a2540]">Requirements</h2>
              <ul className="mt-6 space-y-4">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <Check className="mt-1 h-4 w-4 shrink-0 rounded-full bg-brand p-0.5 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=provider" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                View full requirements
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
              <h2 className="text-lg font-extrabold text-[#0a2540]">Why Pros Love LocalPro</h2>
              <div className="mt-6 space-y-5">
                {proPerks.map(({ title, description, Icon }) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0a2540]">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-extrabold text-[#0a2540]">What Our Pros Say</h2>
                <Sparkles className="h-6 w-6 text-brand" />
              </div>
              <div className="mt-6 space-y-6">
                {testimonials.map((testimonial) => (
                  <figure key={testimonial.name}>
                    <div className="mb-3 flex items-center gap-3">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={44}
                        height={44}
                        className="rounded-full object-cover"
                      />
                      <figcaption>
                        <div className="flex gap-0.5 text-brand">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="mt-1 text-sm font-extrabold text-[#0a2540]">{testimonial.name}</p>
                        <p className="text-xs text-slate-500">{testimonial.role}</p>
                      </figcaption>
                    </div>
                    <blockquote className="text-sm leading-6 text-slate-600">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                  </figure>
                ))}
              </div>
              <Link href="/blog" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                View more stories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-site flex-col gap-6 rounded-3xl bg-gradient-to-r from-[#0a2540] via-primary-900 to-brand-700 p-7 text-white shadow-2xl shadow-primary-900/15 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-5">
              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 sm:flex">
                <UserPlus className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to grow your business?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                  Join LocalPro today and start getting matched with customers in your area.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/register?role=provider"
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-sm font-bold text-[#0a2540] transition hover:bg-brand-50"
              >
                Sign Up as a Pro
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Already have an account? Log in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
