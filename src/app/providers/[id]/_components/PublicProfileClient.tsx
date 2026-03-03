"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Star, Sparkles, Briefcase, Timer, Clock, CheckCircle2,
  XCircle, MapPin, Calendar, TrendingUp, Award, MessageSquare,
  Flame, User, Share2, Check, ShieldCheck, BookOpen,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";

/* ─── Types ─────────────────────────────────────────────────── */
export interface WorkSlot { enabled: boolean; from: string; to: string; }
export interface PortfolioItem { title: string; description: string; imageUrl?: string | null; }
export interface ServiceArea { _id: string; label: string; address: string; }

export interface ProviderProfileData {
  userId: { _id?: string; name: string; email: string; isVerified: boolean; avatar?: string | null; kycStatus?: "none" | "pending" | "approved" | "rejected" };
  bio?: string;
  skills?: string[];
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

/* ─── Constants ──────────────────────────────────────────────── */
const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
type Day = typeof DAYS[number];

const DAY_LABELS: Record<Day, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const availabilityConfig = {
  available:   { label: "Available",   classes: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  busy:        { label: "Busy",        classes: "bg-amber-100 text-amber-700",     icon: Clock         },
  unavailable: { label: "Unavailable", classes: "bg-slate-100 text-slate-500",     icon: XCircle       },
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

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-28 flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
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

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
      {item.imageUrl ? (
        <div className="relative h-40 bg-slate-100">
          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
          <Briefcase className="h-8 w-8 text-slate-300" />
        </div>
      )}
      <div className="p-3">
        <p className="font-semibold text-sm text-slate-800 truncate">{item.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
      </div>
    </div>
  );
}

/* ─── Share button ───────────────────────────────────────────── */
function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "LocalPro provider profile", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

/* ─── Sign-in CTA ────────────────────────────────────────────── */
function HireCTA({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3">
      <p className="text-sm font-semibold text-slate-800">Want to hire {name}?</p>
      <p className="text-xs text-slate-500">Create a free account or sign in to post a job or save their profile.</p>
      <div className="flex gap-2 justify-center">
        <Link
          href="/register"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Sign up free
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
type Tab = "overview" | "reviews" | "schedule" | "portfolio";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [reviewsTotal, setReviewsTotal] = useState(totalReviews);
  const [reviewPage, setReviewPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const avail = profile.availabilityStatus ?? "unavailable";
  const AvailIcon = availabilityConfig[avail].icon;
  const name = profile.userId.name;
  const initial = name.charAt(0).toUpperCase();

  const LIMIT = 10;
  const hasMoreReviews = reviews.length < reviewsTotal;

  const loadMoreReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await apiFetch(`/api/providers/${providerId}/reviews?page=${reviewPage + 1}&limit=${LIMIT}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { reviews: ReviewData[]; total: number };
      setReviews((prev) => [...prev, ...data.reviews]);
      setReviewsTotal(data.total);
      setReviewPage((p) => p + 1);
    } catch {
      toast.error("Failed to load more reviews");
    } finally {
      setLoadingReviews(false);
    }
  }, [providerId, reviewPage]);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview",  label: "Overview" },
    { key: "reviews",   label: "Reviews",   count: reviewsTotal },
    { key: "schedule",  label: "Schedule" },
    { key: "portfolio", label: "Portfolio", count: profile.portfolioItems?.length },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center ring-4 ring-white shadow-md">
            {profile.userId.avatar ? (
              <Image src={profile.userId.avatar} alt={name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <span className="text-3xl font-bold text-primary">{initial}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{name}</h1>
              {profile.userId.isVerified && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">✓ Verified</span>
              )}
              {profile.isLocalProCertified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                  🎖️ LocalPro Certified
                </span>
              )}
              {profile.userId.kycStatus === "approved" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200">
                  <ShieldCheck className="h-3 w-3" /> KYC Verified
                </span>
              )}
              {(profile.streak ?? 0) >= 3 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                  <Flame className="h-3 w-3" /> {profile.streak}-star streak
                </span>
              )}
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${availabilityConfig[avail].classes}`}>
              <AvailIcon className="h-3 w-3" />
              {availabilityConfig[avail].label}
            </span>

            {(profile.avgRating ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Stars rating={profile.avgRating ?? 0} />
                <span className="text-sm font-semibold text-slate-700">{(profile.avgRating ?? 0).toFixed(1)}</span>
                <span className="text-xs text-slate-400">({reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""})</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <ShareButton />
            <Link
              href={`/login?next=/providers/${providerId}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Hire
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-0.5">Completed Jobs</p>
            <p className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
              <Briefcase className="h-4 w-4 text-slate-400" />
              {profile.completedJobCount ?? 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-0.5">Experience</p>
            <p className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
              <Timer className="h-4 w-4 text-slate-400" />
              {profile.yearsExperience ? `${profile.yearsExperience}yr` : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-0.5">Hourly Rate</p>
            <p className="text-lg font-bold text-slate-900">
              {profile.hourlyRate ? formatCurrency(profile.hourlyRate) : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 mb-0.5">Completion Rate</p>
            <p className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              {profile.completionRate ? `${profile.completionRate}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                tab === t.key ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            {profile.bio && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" /> About
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {(profile.skills?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-slate-400" /> Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.map((s) => (
                    <span key={s} className="text-xs bg-primary/8 text-primary px-3 py-1 rounded-full font-medium border border-primary/15">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(profile.workExperiences?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" /> Work Experience
                </h3>
                <ul className="space-y-2">
                  {profile.workExperiences?.map((exp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(profile.serviceAreas?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> Service Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.serviceAreas?.map((area) => (
                    <span key={area._id} className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {area.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            {/* Rating breakdown */}
            {profile.breakdown && profile.breakdown.count > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" /> Rating Breakdown
                  <span className="ml-auto text-xs text-slate-400">{profile.breakdown.count} reviews</span>
                </h3>
                <div className="space-y-2.5">
                  {(["quality","professionalism","punctuality","communication"] as const).map((k) => (
                    <RatingBar key={k} label={k} value={(profile.breakdown as NonNullable<typeof profile.breakdown>)[k]} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick facts */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Quick facts</h3>
              {profile.yearsExperience !== undefined && profile.yearsExperience > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Timer className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {profile.yearsExperience} year{profile.yearsExperience !== 1 ? "s" : ""} of experience
                </div>
              )}
              {profile.hourlyRate && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {formatCurrency(profile.hourlyRate)} / hour
                </div>
              )}
              {(profile.completionRate ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {profile.completionRate}% completion rate
                </div>
              )}
              {(profile.avgResponseTimeHours ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  Responds within {(profile.avgResponseTimeHours ?? 0) < 1
                    ? "an hour"
                    : `${Math.round(profile.avgResponseTimeHours!)}hr`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEWS ──────────────────────────────────────────── */}
      {tab === "reviews" && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No reviews yet.</p>
            </div>
          ) : (
            <>
              {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
              {hasMoreReviews && (
                <button
                  onClick={loadMoreReviews}
                  disabled={loadingReviews}
                  className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loadingReviews ? "Loading…" : `Load more (${reviewsTotal - reviews.length} remaining)`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SCHEDULE ─────────────────────────────────────────── */}
      {tab === "schedule" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" /> Weekly Availability
          </h3>
          {!profile.schedule || !Object.values(profile.schedule).some((d) => d.enabled) ? (
            <p className="text-sm text-slate-400">No schedule set.</p>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day) => {
                const slot = profile.schedule?.[day];
                if (!slot) return null;
                return (
                  <div key={day} className={`flex items-center gap-4 rounded-lg px-4 py-2.5 ${slot.enabled ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
                    <span className={`text-xs font-semibold w-8 ${slot.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                      {DAY_LABELS[day]}
                    </span>
                    {slot.enabled ? (
                      <span className="text-sm text-slate-700">{slot.from} – {slot.to}</span>
                    ) : (
                      <span className="text-sm text-slate-400">Off</span>
                    )}
                    {slot.enabled && (
                      <span className="ml-auto text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Available</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PORTFOLIO ────────────────────────────────────────── */}
      {tab === "portfolio" && (
        <div>
          {(profile.portfolioItems?.length ?? 0) === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No portfolio items yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.portfolioItems?.map((item, i) => <PortfolioCard key={i} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="pt-2 pb-8">
        <HireCTA name={name} />
      </div>
    </div>
  );
}
