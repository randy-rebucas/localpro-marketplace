"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Star, Heart, Sparkles, Briefcase, Timer, Clock, CheckCircle2,
  XCircle, MapPin, Calendar, ChevronLeft, TrendingUp, Award,
  MessageSquare, Flame, User, Building2, ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";
import Button from "@/components/ui/Button";

const DirectJobModal = dynamic(() => import("@/components/client/DirectJobModal"), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────── */
export interface WorkSlot { enabled: boolean; from: string; to: string; }
export interface PortfolioItem { title: string; description: string; imageUrl?: string | null; }
export interface ServiceArea { _id: string; label: string; address: string; }

export interface ProviderProfileData {
  userId: { _id: string; name: string; email: string; isVerified: boolean; avatar?: string | null };
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
  agency?: { name: string; staffCount: number; plan: string } | null;
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

/* ─── Helpers ────────────────────────────────────────────────── */
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
      <span className="text-xs text-slate-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

/* ─── ReviewCard ─────────────────────────────────────────────── */
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

/* ─── PortfolioCard ──────────────────────────────────────────── */
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

/* ─── Main Component ─────────────────────────────────────────── */
type Tab = "overview" | "reviews" | "schedule" | "portfolio";

export default function ProfileClient({
  profile,
  initialReviews,
  totalReviews,
  providerId,
  isFavoriteInitial,
}: {
  profile: ProviderProfileData;
  initialReviews: ReviewData[];
  totalReviews: number;
  providerId: string;
  isFavoriteInitial: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [favLoading, setFavLoading] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
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

  async function toggleFavorite() {
    setFavLoading(true);
    try {
      if (isFavorite) {
        const res = await apiFetch(`/api/favorites/${providerId}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        const res = await apiFetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId }),
        });
        if (!res.ok) throw new Error();
        setIsFavorite(true);
        toast.success("Added to favorites!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFavLoading(false);
    }
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview",   label: "Overview"  },
    { key: "reviews",    label: "Reviews",   count: reviewsTotal },
    { key: "schedule",   label: "Schedule"  },
    { key: "portfolio",  label: "Portfolio", count: profile.portfolioItems?.length },
  ];

  return (
    <>
      {/* ── Hero card ─────────────────────────────────────────── */}
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
              {(profile.streak ?? 0) >= 3 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                  <Flame className="h-3 w-3" /> {profile.streak}-star streak
                </span>
              )}
              {profile.agency && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">
                  <Building2 className="h-3 w-3" /> {profile.agency.name} &middot; {profile.agency.staffCount} staff
                </span>
              )}
              {profile.earnedBadges?.map((badge) => (
                <span key={badge.badgeSlug} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
                  <ShieldCheck className="h-3 w-3 text-yellow-600" /> {badge.courseTitle}
                </span>
              ))}
            </div>

            {/* Availability pill */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${availabilityConfig[avail].classes}`}>
              <AvailIcon className="h-3 w-3" />
              {availabilityConfig[avail].label}
            </span>

            {/* Short stats row */}
            {(profile.avgRating ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Stars rating={profile.avgRating ?? 0} />
                <span className="text-sm font-semibold text-slate-700">{(profile.avgRating ?? 0).toFixed(1)}</span>
                <span className="text-xs text-slate-400">({reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""})</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                isFavorite
                  ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              {isFavorite ? "Unfavorite" : "Favorite"}
            </button>
            <Button onClick={() => setShowPostJob(true)} className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Post a Job
            </Button>
          </div>
        </div>

        {/* ── Stats strip ───────────────────────────────────── */}
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

      {/* ── Tabs ──────────────────────────────────────────────── */}
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

      {/* ── Tab content ───────────────────────────────────────── */}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" /> About
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
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

            {/* Work experience */}
            {(profile.workExperiences?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" /> Work Experience
                </h3>
                <ul className="space-y-2">
                  {profile.workExperiences?.map((exp, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Service areas */}
            {(profile.serviceAreas?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> Service Areas
                </h3>
                <div className="space-y-2">
                  {profile.serviceAreas?.map((area) => (
                    <div key={area._id} className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{area.label}</span>
                        <span className="text-slate-400 text-xs block">{area.address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Rating breakdown */}
            {profile.breakdown && profile.breakdown.count > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" /> Rating Breakdown
                </h3>
                <div className="space-y-3">
                  <RatingBar label="Quality"         value={profile.breakdown.quality} />
                  <RatingBar label="Professionalism" value={profile.breakdown.professionalism} />
                  <RatingBar label="Punctuality"     value={profile.breakdown.punctuality} />
                  <RatingBar label="Communication"   value={profile.breakdown.communication} />
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Based on {profile.breakdown.count} detailed review{profile.breakdown.count !== 1 ? "s" : ""}</p>
              </div>
            )}

            {/* Response time */}
            {(profile.avgResponseTimeHours ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Avg. Response Time</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {profile.avgResponseTimeHours! < 1
                      ? "Under 1 hour"
                      : `~${Math.round(profile.avgResponseTimeHours!)}h`}
                  </p>
                </div>
              </div>
            )}

            {/* Streak */}
            {(profile.streak ?? 0) >= 3 && (
              <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 flex items-center gap-3">
                <Flame className="h-8 w-8 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">{profile.streak}-star streak</p>
                  <p className="text-xs text-orange-600">Last {profile.streak} reviews were all 5 stars</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVIEWS */}
      {tab === "reviews" && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No reviews yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to work with this provider and leave a review.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              {(profile.avgRating ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center flex-shrink-0">
                    <p className="text-5xl font-bold text-slate-900">{(profile.avgRating ?? 0).toFixed(1)}</p>
                    <Stars rating={profile.avgRating ?? 0} />
                    <p className="text-xs text-slate-400 mt-1">{reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""}</p>
                  </div>
                  {profile.breakdown && profile.breakdown.count > 0 && (
                    <div className="flex-1 w-full space-y-2">
                      <RatingBar label="Quality"         value={profile.breakdown.quality} />
                      <RatingBar label="Professionalism" value={profile.breakdown.professionalism} />
                      <RatingBar label="Punctuality"     value={profile.breakdown.punctuality} />
                      <RatingBar label="Communication"   value={profile.breakdown.communication} />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
              </div>

              {hasMoreReviews && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={loadMoreReviews}
                    disabled={loadingReviews}
                    className="px-8"
                  >
                    {loadingReviews ? "Loading…" : `Load more (${reviewsTotal - reviews.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SCHEDULE */}
      {tab === "schedule" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" /> Weekly Availability
          </h3>
          {profile.schedule ? (
            <div className="space-y-2">
              {DAYS.map((day) => {
                const slot = profile.schedule?.[day];
                const enabled = slot?.enabled ?? false;
                return (
                  <div key={day} className={`flex items-center justify-between py-2.5 px-4 rounded-lg ${enabled ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
                    <span className="text-sm font-medium text-slate-700 w-10">{DAY_LABELS[day]}</span>
                    {enabled ? (
                      <span className="text-sm text-emerald-700 font-medium">
                        {slot?.from} – {slot?.to}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unavailable</span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No schedule set yet.</p>
          )}
        </div>
      )}

      {/* PORTFOLIO */}
      {tab === "portfolio" && (
        <div>
          {(profile.portfolioItems?.length ?? 0) === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No portfolio items yet</p>
              <p className="text-xs text-slate-400 mt-1">This provider hasn&apos;t added any past work samples.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.portfolioItems?.map((item, i) => (
                <PortfolioCard key={i} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post Job Modal */}
      {showPostJob && (
        <DirectJobModal
          providerId={providerId}
          providerName={name}
          onClose={() => setShowPostJob(false)}
        />
      )}
    </>
  );
}
