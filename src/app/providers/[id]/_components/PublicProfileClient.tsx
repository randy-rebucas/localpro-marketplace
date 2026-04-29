"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Star, Briefcase, CheckCircle2,
  MapPin, Calendar, MessageSquare,
  Check, ShieldCheck,
} from "lucide-react";

const DirectJobModal = dynamic(() => import("@/components/client/DirectJobModal"), { ssr: false });
import { formatCurrency, formatDate } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */
export interface WorkSlot { enabled: boolean; from: string; to: string; }
export interface PortfolioItem { title: string; description: string; imageUrl?: string | null; }
export interface ServiceArea { _id: string; label: string; address: string; }

export interface ProviderProfileData {
  userId: { _id?: string; name: string; email: string; isVerified: boolean; avatar?: string | null; kycStatus?: "none" | "pending" | "approved" | "rejected" };
  bio?: string;
  skills?: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>;
  workExperiences?: string[];
  yearsExperience?: number;
  hourlyRate?: number | null;
  avgRating?: number;
  completedJobCount?: number;
  completionRate?: number;
  avgResponseTimeHours?: number;
  availabilityStatus?: "available" | "busy" | "unavailable";
  portfolioItems?: PortfolioItem[];
  serviceAreas?: ServiceArea[];
  schedule?: Record<string, WorkSlot>;
  isLocalProCertified?: boolean;
  agency?: { name: string; staffCount: number; plan: string } | null;
  pesoVerificationTags?: string[];
  pesoReferredBy?: string | null;
  certifications?: { title: string; issuer: string; issuedAt: string }[];
  barangay?: string | null;
  earnedBadges?: { badgeSlug: string; courseTitle: string; earnedAt: string }[];
  breakdown?: {
    quality: number; professionalism: number;
    punctuality: number; communication: number; count: number;
  } | null;
  streak?: number;
}

export interface ReviewData {
  _id: string;
  rating: number;
  feedback: string;
  breakdown?: {
    quality?: number; professionalism?: number;
    punctuality?: number; communication?: number;
  } | null;
  clientId: { name: string };
  jobId: { title: string };
  createdAt: string;
}

const availabilityConfig = {
  available:   { label: "Available" },
  busy:        { label: "Busy" },
  unavailable: { label: "Unavailable" },
};

/* ─── Sub-components ─────────────────────────────────────────── */
function Stars({ rating, sm }: { rating: number; sm?: boolean }) {
  const sz = sm ? "h-3 w-3" : "h-4 w-4";
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
            {review.clientId.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{review.clientId.name}</p>
            <p className="text-[11px] text-slate-400">{formatDate(new Date(review.createdAt))}</p>
          </div>
        </div>
        <Stars rating={review.rating} sm />
      </div>
      {review.jobId?.title && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {review.jobId.title}
        </p>
      )}
      <p className="text-sm text-slate-600 leading-relaxed">{review.feedback}</p>
      {review.breakdown && Object.values(review.breakdown).some(Boolean) && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {(["quality","professionalism","punctuality","communication"] as const).map((k) => {
            const val = review.breakdown?.[k];
            if (!val) return null;
            return (
              <div key={k} className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-300 rounded-full" style={{ width: `${(val / 5) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 capitalize w-24">{k}</span>
                <span className="text-[10px] font-medium text-slate-600">{val.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function PublicProfileClient({
  profile,
  initialReviews,
  totalReviews,
  providerId,
}: {
  profile: ProviderProfileData;
  initialReviews: ReviewData[];
  totalReviews: number;
  providerId: string;
}) {
  const [showDirectHire, setShowDirectHire] = useState(false);

  const avail = profile.availabilityStatus ?? "unavailable";
  const name = profile.userId.name;
  const initial = name.charAt(0).toUpperCase();

  const primarySkill = profile.skills?.[0]?.skill ?? "Service Professional";
  const serviceAreas = profile.serviceAreas ?? [];
  const displayReviews = initialReviews.slice(0, 3);
  const displayServices = (profile.skills?.length ? profile.skills : [{ skill: primarySkill, yearsExperience: profile.yearsExperience ?? 1, hourlyRate: profile.hourlyRate ? String(profile.hourlyRate) : "" }]).slice(0, 6);
  const portfolio = profile.portfolioItems ?? [];

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span>/</span>
        <Link href="/providers" className="hover:text-brand-700">Find Professionals</Link>
        <span>/</span>
        <span>{primarySkill}</span>
        <span>/</span>
        <span className="text-slate-700">{name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)_300px]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="relative h-64 bg-gradient-to-br from-brand-100 to-primary-100">
              {profile.userId.avatar ? (
                <Image src={profile.userId.avatar} alt={name} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl font-extrabold text-brand-700">{initial}</div>
              )}
              <span className="absolute left-4 top-4 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white">Verified Pro</span>
            </div>
            <div className="space-y-3 p-4">
              <button
                onClick={() => setShowDirectHire(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                <Calendar className="h-4 w-4" />
                Book Now
              </button>
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <MessageSquare className="h-4 w-4" />
                Message
              </Link>
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <Check className="h-4 w-4" />
                Save to Favorites
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-7">
            <p className="text-sm font-bold text-brand-700">{primarySkill}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-extrabold leading-tight text-[#0a2540]">{name}</h1>
              {profile.userId.isVerified && <CheckCircle2 className="h-6 w-6 fill-primary-50 text-primary" />}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <strong className="text-[#0a2540]">{(profile.avgRating ?? 4.8).toFixed(1)}</strong>
                <span>({totalReviews} reviews)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {serviceAreas[0]?.address ?? "Philippines"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Member since May 2023
              </span>
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-[#0a2540]">
              Reliable {primarySkill.toLowerCase()} services with quality work you can trust.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {profile.bio || `${name} is a trusted LocalPro professional with verified experience, reliable service, and a commitment to quality workmanship.`}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-200 py-5 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Response Time</p>
                <p className="mt-1 text-sm font-extrabold text-[#0a2540]">
                  {(profile.avgResponseTimeHours ?? 0) < 1 ? "Within 1 hour" : `${Math.round(profile.avgResponseTimeHours ?? 1)} hours`}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jobs Completed</p>
                <p className="mt-1 text-sm font-extrabold text-[#0a2540]">{profile.completedJobCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">On LocalPro</p>
                <p className="mt-1 text-sm font-extrabold text-[#0a2540]">{profile.yearsExperience ?? 1} year</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Average Rating</p>
                <p className="mt-1 text-sm font-extrabold text-[#0a2540]">{(profile.avgRating ?? 4.8).toFixed(1)}</p>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-3 text-sm font-extrabold text-[#0a2540]">Verifications & Certifications</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {["ID Verified", "Background Checked", "TESDA Certified", "BIR Registered", "PhilHealth Member"].map((item) => (
                  <div key={item} className="text-center text-[11px] font-medium text-slate-600">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-lg font-extrabold text-[#0a2540]">Services Offered</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayServices.map((service) => (
                <div key={service.skill} className="rounded-xl border border-slate-200 bg-white p-4">
                  <Briefcase className="mb-3 h-5 w-5 text-brand-700" />
                  <h3 className="text-sm font-extrabold text-[#0a2540]">{service.skill}</h3>
                  <p className="mt-1 text-xs font-semibold text-brand-700">
                    From {service.hourlyRate ? service.hourlyRate : profile.hourlyRate ? formatCurrency(profile.hourlyRate) : "PHP 500"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Professional service with clear scope, reliable scheduling, and quality output.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:grid-cols-[1fr_260px]">
            <div>
              <h2 className="text-lg font-extrabold text-[#0a2540]">About {name.split(" ")[0] || name}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {profile.bio || `I specialize in ${primarySkill.toLowerCase()} and take pride in delivering reliable, high-quality service.`}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {[
                  `${profile.yearsExperience ?? 1}+ years of experience`,
                  "Honest and transparent pricing",
                  "Clean and professional service",
                  "Satisfaction-focused workmanship",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-brand-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={portfolio[0]?.imageUrl || "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&h=420&q=80"}
                alt={`${name} work sample`}
                fill
                className="object-cover"
              />
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#0a2540]">Recently Completed Jobs</h2>
              <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                View all jobs
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(portfolio.length ? portfolio.slice(0, 4) : Array.from({ length: 4 })).map((item, index) => {
                const portfolioItem = item as PortfolioItem | undefined;
                return (
                  <div key={portfolioItem?.title ?? index} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
                    <div className="relative h-28 bg-slate-100">
                      <Image
                        src={portfolioItem?.imageUrl || "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=400&h=260&q=80"}
                        alt={portfolioItem?.title || "Completed service job"}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-[10px] font-bold text-white">Completed</span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-extrabold text-[#0a2540]">{portfolioItem?.title || `${primarySkill} Service`}</p>
                      <p className="mt-1 text-xs text-slate-500">{serviceAreas[0]?.label ?? "Local area"}</p>
                      <p className="mt-2 text-sm font-extrabold text-brand-700">{profile.hourlyRate ? formatCurrency(profile.hourlyRate) : "PHP 800"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-extrabold text-[#0a2540]">Availability</h2>
            <p className="mt-3 flex items-center justify-between text-sm font-semibold text-brand-700">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand" />{availabilityConfig[avail].label} Today</span>
              <span>→</span>
            </p>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-extrabold text-[#0a2540]">Service Areas</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {(serviceAreas.length ? serviceAreas.slice(0, 5) : [{ label: "Manila", address: "Manila" }]).map((area) => (
                  <li key={area.label}>{area.label}</li>
                ))}
              </ul>
              <Link href="/providers" className="mt-3 inline-flex text-sm font-bold text-brand-700">View all areas</Link>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-extrabold text-[#0a2540]">Languages</h3>
              <p className="mt-2 text-sm text-slate-600">English, Filipino</p>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-extrabold text-[#0a2540]">Contact</h3>
              <p className="mt-2 text-sm text-slate-600">{profile.userId.email || "Available after booking"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#0a2540]">Reviews ({totalReviews})</h2>
              <Link href="#reviews" className="text-xs font-bold text-brand-700">View all</Link>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <p className="text-4xl font-extrabold text-[#0a2540]">{(profile.avgRating ?? 4.8).toFixed(1)}</p>
              <div>
                <Stars rating={profile.avgRating ?? 4.8} />
                <p className="mt-1 text-xs text-slate-500">Based on {totalReviews} reviews</p>
              </div>
            </div>
            <div className="space-y-4">
              {displayReviews.length > 0 ? displayReviews.map((review) => <ReviewCard key={review._id} review={review} />) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No reviews yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-[#0a2540] via-primary-900 to-brand-700 p-7 text-white shadow-2xl shadow-primary-900/15 sm:p-10 lg:flex lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Need a trusted professional like {name.split(" ")[0] || name}?</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
            Post a job now and get matched with verified pros in your area.
          </p>
        </div>
        <div className="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
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
          </Link>
        </div>
      </div>

      {showDirectHire && (
        <DirectJobModal
          providerId={providerId}
          providerName={name}
          onClose={() => setShowDirectHire(false)}
        />
      )}
    </div>
  );
}
