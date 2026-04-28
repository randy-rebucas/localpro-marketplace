import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  MessageCircle,
  FileText,
  Phone,
  Video,
  Users,
  User,
  Briefcase,
  Building2,
  CreditCard,
  Shield,
  Calendar,
  Settings,
  MessageSquare,
  CalendarCheck,
  CalendarX,
  UserCheck,
  Lock,
  type LucideIcon,
} from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Get help with your LocalPro account, jobs, payments, and more. Find answers to common questions or contact our support team.",
  alternates: { canonical: `${APP_URL}/support` },
  openGraph: {
    title: "Help Center | LocalPro",
    description: "Get help with your LocalPro account, jobs, payments, and more.",
    url: `${APP_URL}/support`,
    siteName: "LocalPro",
    type: "website",
  },
};

/* ── data ───────────────────────────────────────────────────── */

interface CategoryCard {
  key: string;
  title: string;
  desc: string;
  articles: number;
  Icon: LucideIcon;
}

const CATEGORIES: CategoryCard[] = [
  { key: "customers",         title: "For Customers",       desc: "Find help with booking, payments, account, and using LocalPro.",          articles: 23, Icon: User         },
  { key: "pros",              title: "For Pros",            desc: "Learn about your account, jobs, payments, and growing your business.",     articles: 28, Icon: Briefcase    },
  { key: "businesses",        title: "For Businesses",      desc: "Get help with your business profile, services, bookings, and more.",       articles: 20, Icon: Building2    },
  { key: "payments-billing",  title: "Payments & Billing",  desc: "Learn about payments, refunds, fees, and billing methods.",                articles: 16, Icon: CreditCard   },
  { key: "safety-trust",      title: "Safety & Trust",      desc: "Policies, safety tips, and how we keep our community secure.",            articles: 14, Icon: Shield       },
  { key: "bookings-services", title: "Bookings & Services", desc: "Manage bookings, reschedule, cancellations, and more.",                   articles: 19, Icon: Calendar     },
  { key: "account-settings",  title: "Account & Settings",  desc: "Update your profile, notifications, privacy settings, and preferences.",  articles: 15, Icon: Settings     },
  { key: "other",             title: "Other Topics",        desc: "General information and other helpful resources.",                         articles: 10, Icon: MessageSquare},
];

interface PopularArticle {
  title: string;
  desc: string;
  href: string;
  Icon: LucideIcon;
}

const POPULAR: PopularArticle[] = [
  { title: "How do I book a service on LocalPro?",   desc: "Step-by-step guide to booking a service.",           href: "/support/customers#booking",        Icon: CalendarCheck },
  { title: "How do payments work on LocalPro?",      desc: "Learn about payments, methods, and security.",       href: "/support/payments-billing#how",      Icon: CreditCard    },
  { title: "How do I cancel or reschedule?",         desc: "Change or cancel your booking easily.",              href: "/support/bookings-services#cancel",  Icon: CalendarX     },
  { title: "How do I become a Pro on LocalPro?",     desc: "Requirements and steps to join as a pro.",           href: "/support/pros#join",                 Icon: UserCheck     },
  { title: "Is my payment information secure?",      desc: "How we protect your data and transactions.",         href: "/support/safety-trust#payment",      Icon: Lock          },
];

const POPULAR_SEARCHES = ["book a service", "payment", "cancel booking", "become a pro", "business account"];

/* ── page ───────────────────────────────────────────────────── */

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative bg-white overflow-hidden border-b border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[380px]">

              {/* Left: text + search */}
              <div className="py-14 flex flex-col justify-center lg:pr-12">
                <p className="text-[#22c55e] text-xs font-bold uppercase tracking-widest mb-3">
                  Help Center
                </p>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                  How can we help you?
                </h1>
                <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-md">
                  Find answers, guidelines, and resources to help you make the most of LocalPro.
                </p>

                {/* Search */}
                <div className="relative mb-5">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search for articles, topics, or keywords..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  />
                </div>

                {/* Popular searches */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium shrink-0">Popular searches:</span>
                  {POPULAR_SEARCHES.map((term) => (
                    <span
                      key={term}
                      className="px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: stock photo + floating card */}
              <div className="relative hidden lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-white/10" />

                {/* Floating card */}
                <div className="absolute top-8 right-8 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[230px]">
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Need more help?</p>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">Our support team is here for you.</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Chat with us</p>
                        <p className="text-[11px] text-slate-400 leading-tight">Available 8:00 AM - 8:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Submit a request</p>
                        <p className="text-[11px] text-slate-400 leading-tight">We'll get back to you via email</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Browse by Category + Popular Articles ─────────────── */}
        <section className="py-14 bg-white">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-10 items-start">

              {/* Categories grid */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold text-slate-900 mb-6">Browse by Category</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {CATEGORIES.map(({ key, title, desc, articles, Icon }) => (
                    <Link
                      key={key}
                      href={`/support/${key}`}
                      className="group rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all text-center flex flex-col items-center"
                    >
                      <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-1.5 group-hover:text-primary transition-colors leading-snug">
                        {title}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">{desc}</p>
                      <p className="text-xs text-emerald-600 font-semibold">{articles} articles →</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Articles sidebar */}
              <aside className="hidden lg:block w-72 shrink-0">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Popular Articles</h2>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {POPULAR.map(({ title, desc, href, Icon }) => (
                    <Link
                      key={title}
                      href={href}
                      className="group flex gap-3 p-4 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-snug group-hover:text-primary transition-colors mb-0.5">
                          {title}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4">
                  <Link
                    href="/support/popular"
                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    View all popular articles →
                  </Link>
                </div>
              </aside>

            </div>
          </div>
        </section>

        {/* ── Can't find / Guidelines / Videos ─────────────────── */}
        <section className="bg-slate-50 border-t border-slate-100 py-12">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

              {/* Can't find */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    <circle cx="19" cy="19" r="3" />
                    <path d="M21.5 21.5l-1.5-1.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                    Can't find what you're looking for?
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    Search our extensive help resources or reach out to our support team for personalized assistance.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-block px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-primary/40 hover:text-primary transition-colors shadow-sm"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>

              {/* Community Guidelines */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1">Community Guidelines</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Be part of a respectful and trustworthy community for everyone.
                  </p>
                  <Link href="/community-guidelines" className="text-xs font-semibold text-emerald-600 hover:underline">
                    Read Guidelines →
                  </Link>
                </div>
              </div>

              {/* Video Tutorials */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm mb-1">Video Tutorials</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    Watch step-by-step videos to help you get started.
                  </p>
                  <Link href="/tutorials" className="text-xs font-semibold text-emerald-600 hover:underline">
                    Watch Videos →
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Still need help? ──────────────────────────────────── */}
        <section className="py-14 bg-white border-t border-slate-100">
          <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Still need help?</h2>
            <p className="text-sm text-slate-500 mb-10">Our support team is ready to assist you.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">

              {/* Live Chat */}
              <div className="flex flex-col items-center p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-3">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">Live Chat</p>
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Chat with our team in real time.
                  <br />Available 8:00 AM - 8:00 PM
                </p>
              </div>

              {/* Submit a Request */}
              <div className="flex flex-col items-center p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">Submit a Request</p>
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Send us a message and we'll
                  <br />get back to you.
                </p>
              </div>

              {/* Call Us */}
              <div className="flex flex-col items-center p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-3">
                  <Phone className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">Call Us</p>
                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  (02) 8 123 4567
                  <br />Mon - Sun, 8:00 AM - 8:00 PM
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
